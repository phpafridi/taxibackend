import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth-config";
export async function POST(request: Request) {

    try {

        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json(
                { messsage: "unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { messsage: "api hit" },
            { status: 200 }
        )
    } catch (error) {

    }

}