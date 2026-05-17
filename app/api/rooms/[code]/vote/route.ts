import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Vote } from "@/database"
import { apiHandler } from "@/lib/api-handler";
import { getSession } from "@/lib/session";

export const POST = apiHandler(async (
    req: NextRequest,
    { params }: { params: { code: String } }
) => {
    const body = await req.json();
    let { participantId, rankings } = body;
    const roomCode = params.code;

    const session = await getSession();
    
    // if logged in, validate vote using userId
    if (session) {
        participantId = session.userData._id;
    }

    if (!participantId || !Array.isArray(rankings)) {
        return NextResponse.json(
            { message: "Invalid request"},
            { status: 400 }
        )
    }

    await connectToDatabase();

    // check for duplicates
    const exists = await Vote.findOne({ roomCode, participantId });

    if (exists) {
        return NextResponse.json(
            { message: "Only one vote accepted from each user"},
            { status: 409 }
        )
    }

    // store the vote in database
    await Vote.create({
        roomCode: roomCode,
        participantId: participantId,
        rankings: rankings,
    });

    return NextResponse.json(
        { status: 200 }
    );
});

