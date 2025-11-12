import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Fetch public holidays for a country and year
 *
 * Uses the free Nager.Date API: https://date.nager.at/
 *
 * GET /api/holidays?country=US&year=2024
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country');
    const year = searchParams.get('year');

    // Validate parameters
    if (!country) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      );
    }

    if (!year) {
      return NextResponse.json(
        { error: 'Year is required' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json(
        { error: 'Invalid year' },
        { status: 400 }
      );
    }

    // Fetch from Nager.Date API
    const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${yearNum}/${country.toUpperCase()}`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'PTO-Planner/1.0',
      },
    });

    if (!response.ok) {
      // Handle API errors
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Country not found or no holidays available' },
          { status: 404 }
        );
      }

      throw new Error(`API returned ${response.status}`);
    }

    const holidays = await response.json();

    // Transform the data to our format
    const transformedHolidays = holidays.map((holiday: any) => ({
      date: holiday.date,
      name: holiday.localName || holiday.name,
      description: holiday.name,
      repeats_yearly: false, // Observed dates vary year-to-year, so treat as specific instances
      country_code: country.toUpperCase(),
    }));

    return NextResponse.json({
      success: true,
      data: transformedHolidays,
      count: transformedHolidays.length,
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch holidays. Please try again later.'
      },
      { status: 500 }
    );
  }
}
