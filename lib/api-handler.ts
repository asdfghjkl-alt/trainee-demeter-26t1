import { NextRequest, NextResponse } from "next/server";

interface ApiError extends Error {
  statusCode?: number;
  code?: number | string;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, unknown>;
}

/**
 * Wrapper function to handle any errors encountered in the handler
 * @param handler Request handler that is inputted into api handler
 * @returns
 */
export const apiHandler =
  <TArgs extends unknown[]>(
    handler: (
      req: NextRequest,
      ...args: TArgs
    ) => Promise<NextResponse | Response>,
  ) =>
  async (req: NextRequest | Request, ...args: TArgs) => {
    try {
      return await handler(req as NextRequest, ...args);
    } catch (err) {
      const error = err as ApiError;
      console.error(err);

      const statusCode = error.statusCode || 500;
      const message = error.message || "Internal Server Error";

      // Handle Mongoose Validation Errors specifically if needed
      if (error.name === "ValidationError") {
        return NextResponse.json(
          { message: "Validation Error", errors: error.errors },
          { status: 400 },
        );
      }

      // Handle Mongoose Duplicate Key Errors
      if (error.code === 11000 && error.keyValue) {
        return NextResponse.json(
          {
            message: "Duplicate value entered",
            field: Object.keys(error.keyValue),
          },
          { status: 409 },
        );
      }

      if (error.code === 404) {
        return NextResponse.json(
          { message: "Page not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ message }, { status: statusCode });
    }
  };
