import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import connectToDatabase from "@/lib/mongodb";
import { Room } from "@/database";
import { getSession } from "@/lib/session";
import { generateLocations, type ParticipantCoord } from "@/lib/algorithm";
import type { IParticipant } from "@/database";

export const POST = apiHandler(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ code: string }> },
  ) => {
    // --- Auth: only logged-in users can trigger the algorithm ---------------
    const session = await getSession();
    if (!session?.userData) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { code } = await params;
    const room = await Room.findOne({ code }).populate("categories");
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // --- Auth: only the room admin can generate locations -------------------
    if (room.adminUser.toString() !== session.userData._id.toString()) {
      return NextResponse.json(
        { message: "Forbidden: Only the room admin can generate locations" },
        { status: 403 },
      );
    }

    // --- Guard: room must be in waiting status ------------------------------
    if (room.status !== "waiting") {
      return NextResponse.json(
        {
          message:
            "Locations can only be generated while the room is in the waiting state",
        },
        { status: 409 },
      );
    }

    if (room.hasGeneratedLocations) {
      return NextResponse.json(
        { message: "Locations can only be auto-generated once per room." },
        { status: 403 },
      );
    }

    // --- Parse optional travelBudgetMinutes from body -----------------------
    let travelBudgetMinutes: number = room.travelBudgetMinutes ?? 20;
    let customCategoryIds: string[] | undefined;

    try {
      const body = await req.json().catch(() => ({}));
      if (typeof body.travelBudgetMinutes === "number") {
        const clamped = Math.max(1, Math.min(120, body.travelBudgetMinutes));
        travelBudgetMinutes = clamped;
        // Persist the updated budget on the room
        room.travelBudgetMinutes = clamped;
      }
      if (Array.isArray(body.categoryIds)) {
        customCategoryIds = body.categoryIds;
      }
    } catch {
      // Body is optional; ignore parse errors
    }

    // --- Env tokens ---------------------------------------------------------
    const mapboxToken = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      return NextResponse.json(
        { message: "Server configuration error: Mapbox token is not set" },
        { status: 500 },
      );
    }
    const tfnswKey = process.env.TFNSW_API_KEY; // optional
    const targomoKey = process.env.TARGOMO_API_KEY; // optional

    // --- Build participant list ----------------------------------------------
    const participants: ParticipantCoord[] = (
      room.participants as IParticipant[]
    )
      .filter(
        (p) =>
          typeof p.latitude === "number" &&
          typeof p.longitude === "number" &&
          !isNaN(p.latitude) &&
          !isNaN(p.longitude),
      )
      .map((p) => ({
        latitude: p.latitude!,
        longitude: p.longitude!,
        transportationMode: p.transportationMode,
        willingness: p.willingness,
      }));

    const totalParticipants = (room.participants as IParticipant[]).length;
    const skippedCount = totalParticipants - participants.length;

    if (participants.length === 0) {
      return NextResponse.json(
        {
          message:
            "No participants have location coordinates. Ask participants to re-enter their location.",
        },
        { status: 422 },
      );
    }

    // --- Rate Limit Downstream APIs (Prevent DoS / Billing Abuse) -----------
    if (participants.length > 30) {
      return NextResponse.json(
        { message: "Cannot generate locations for more than 30 participants at once to prevent API exhaustion." },
        { status: 413 }, // Payload Too Large
      );
    }

    // --- Extract category names (populated) ---------------------------------
    const activeCategories = customCategoryIds
      ? (room.categories as any[]).filter(c => customCategoryIds!.includes(c._id.toString()))
      : (room.categories as any[]);

    const categoryNames: string[] = activeCategories.map(
      (c) => c.name as string,
    );

    if (categoryNames.length === 0) {
      return NextResponse.json(
        { message: "Please select at least one category before generating locations" },
        { status: 422 },
      );
    }

    if (categoryNames.length > 10) {
      return NextResponse.json(
        { message: "Cannot search for more than 10 categories at once." },
        { status: 413 },
      );
    }

    // --- Run the algorithm --------------------------------------------------
    let result;
    try {
      result = await generateLocations({
        participants,
        categoryNames,
        travelBudgetMinutes,
        meetingDirection: room.meetingDirection,
        date: room.date ? new Date(room.date) : undefined,
        mapboxToken,
        tfnswKey,
        targomoKey,
        topN: 5,
        country: room.country,
      });
    } catch (err: any) {
      console.error("generateLocations error:", err);
      return NextResponse.json(
        { message: err.message ?? "Failed to generate locations" },
        { status: 502 },
      );
    }

    // --- Build notices ------------------------------------------------------
    const warnings: string[] = [];
    if (result.warning) warnings.push(result.warning);
    if (result.usedFallback) {
      warnings.push(
        "Disclaimer: Participants' reachable zones did not overlap based on the travel budget. The algorithm used the geographic midpoint of all participants as a fallback.",
      );
    }
    if (skippedCount > 0 && !result.warning) {
      warnings.push(
        `${skippedCount} of ${totalParticipants} participant(s) had no coordinates and were excluded.`,
      );
    }

    // --- Persist: keep admin-added, replace auto-generated ------------------
    const adminAdded = (room.locations as any[]).filter(
      (l) => l.addedByAdmin === true,
    );

    const newLocations = result.locations.map((loc) => ({
      name: loc.name,
      description: loc.description,
      latitude: loc.latitude,
      longitude: loc.longitude,
      category: loc.category,
      addedByAdmin: false, // marks these as algorithm-generated
    }));

    room.locations = [...adminAdded, ...newLocations] as any;
    room.algorithmNotices = warnings;
    room.hasGeneratedLocations = true;
    await room.save();

    // --- Build response -----------------------------------------------------
    return NextResponse.json(
      {
        message: "Locations generated successfully",
        travelBudgetMinutes,
        locations: room.locations,
        ...(warnings.length > 0 ? { warnings } : {}),
      },
      { status: 200 },
    );
  },
);
