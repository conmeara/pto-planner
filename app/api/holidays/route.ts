import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const countryCode = searchParams.get('country') || 'US';
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  try {
    // Fetch holidays from Nager.Date API (free, no auth required)
    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Cache for 24 hours
        next: { revalidate: 86400 }
      }
    );

    if (!response.ok) {
      throw new Error(`Holidays API returned ${response.status}`);
    }

    const holidays = await response.json();

    // Transform the data to a simpler format
    const transformedHolidays = holidays.map((holiday: any) => ({
      date: holiday.date,
      name: holiday.name,
      localName: holiday.localName,
      countryCode: holiday.countryCode,
      global: holiday.global,
      counties: holiday.counties,
      types: holiday.types,
    }));

    return NextResponse.json({
      success: true,
      data: transformedHolidays,
      country: countryCode,
      year: parseInt(year),
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch holidays',
        data: [],
      },
      { status: 500 }
    );
  }
}
