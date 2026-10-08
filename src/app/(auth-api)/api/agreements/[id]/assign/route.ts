// app/(auth-api)/api/agreements/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'

// TypeScript version
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Await the params promise
    const { id } = await context.params
    
    
    // Your business logic here
    // const agreement = await sendAgreement(id)
    
    return NextResponse.json({
      success: true,
      message: `Agreement ${id} sent successfully`,
      agreement: {
        id: parseInt(id),
        // ... other agreement properties
      }
    })
    
  } catch (error) {
    console.error('Error sending agreement:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send agreement' 
      },
      { status: 500 }
    )
  }
}

// Also add GET method if needed
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params
  
  return NextResponse.json({
    success: true,
    message: `GET request for agreement ${id}`,
    agreementId: id
  })
}