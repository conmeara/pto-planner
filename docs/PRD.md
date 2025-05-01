# Product Requirements Document

## 1. Product Overview

**Product Name**: PTO Planner\
**Description**: A web application that helps employees track and optimize their Paid Time Off (PTO) throughout the year. The app provides a visual calendar, calculates PTO accrual in multiple formats, automatically includes public holidays for the user’s country, and recommends the best strategies to use PTO for maximum rest and travel flexibility.\
**Theme**: Custom Ghibli-inspired UI/UX

---

## 2. Objectives & Goals

1. **Centralize PTO Tracking**\
   Enable users to easily view how many PTO days/hours they have, see how these accrue over time, and monitor updates as they select PTO days.

2. **Optimize Vacation Planning**\
   Provide intelligent suggestions on when to take PTO to maximize breaks (e.g., long weekends, short breaks, extended vacations).

3. **Integrate Public Holidays**\
   Automatically detect and display public holidays based on the user’s country to help them plan around official days off.

---

## 3. Key Features

1. **Year‑Long Calendar View**

   - Display the entire year in a single or multi‑month view.
   - Ability to navigate years.
   - Mark weekends, public holidays, suggested PTO, and user‑selected PTO.

2. **PTO**

   - Input initial PTO balance (days or hours) with _as‑of date_.
   - Support different accrual frequencies: weekly, bi‑weekly, monthly, yearly.
   - Calculate updated PTO balance automatically as time passes or as PTO is selected.
   - Support maximum PTO carry‑over for each year.

3. **Weekend**

   - List of days with the ability to edit which ones count as the weekend.

4. **Holidays**

   - Detect user’s country automatically at first launch.
   - Fetch and display public holidays for that specific region.
   - Allow manual override if the user wants to change the country.
   - Allow users to edit holiday list.

5. **Suggested PTO Strategies**

   - Offer multiple “optimization” scenarios:
     1. **Balanced Mix**: Short breaks + longer vacations
     2. **Long Weekends**: Multiple 3–4 day breaks throughout the year
     3. **Mini Breaks**: Several 5–6 day breaks
     4. **Week‑Long Breaks**: 7–9 day getaways
     5. **Extended Vacations**: 10–15 day breaks for deeper relaxation
   - Future expansions can include other strategies or custom preferences.

6. **Selection & Visualization**

   - Click or tap on calendar days to mark PTO.
   - View total remaining PTO in real time after selecting/unselecting days.
   - Display break durations (start/end dates) for any planned PTO blocks.
   - Each month displays the PTO available to use.
   - Hover tip when user hovers over a specific day and shows the current PTO balance of that day.

7. **Save**

   - Users can sign up with an email (no password).
   - A “magic link” is sent to that email to restore the user’s saved PTO plan.
   - _Buy Me a Coffee_ link for support.

8. **Thematic UI/UX**

   - Ghibli‑inspired color palette and design elements.
   - Soft, friendly aesthetic while maintaining clarity and functionality.
   - Intuitive navigation and clear visual cues (hover states, selection highlights).

---

## 7. Menu Design (Legend Island Bar)

1. **Island Bar Positioning**

   - A floating, pill‑shaped “island” is pinned at the very top of the viewport, centered horizontally, sitting directly above the calendar grid.
   - Uses a soft glass‑morphism backdrop with a gentle drop‑shadow to echo the iPhone Dynamic Island.

2. **Four Tabs = Calendar Legend**\
   The island contains **four equal tabs**, each representing a legend category _and_ acting as a visibility toggle. Each tab opens up the corresponding user inputs and settings:

   1. &#x20;**PTO**&#x20;
   2. **Suggestion PTO**
   3. **Public Holidays**&#x20;
   4. **Weekends**
   5. **Save**

3. **Visual Language & Accessibility**

   - Colour and iconography drawn from the global Ghibli palette; legend colours are shared CSS variables used by calendar day classes.
   - WCAG 2.1‑AA contrast for text/icons against the semi‑transparent pill.
   - Focus outline encompasses the entire bar when navigating via keyboard, with individual tab focus states.
   - Implemented with Headless‑UI `<Tab>` component and Tailwind CSS; ARIA roles `tablist`, `tab`.

4. **Motion**

   - Tabs animate with a 150 ms ease‑out opacity/scale when toggled.
   - The island subtly expands/ contracts on scroll.
   - Users with _reduce‑motion_ preference only see opacity changes.

5. **Implementation Notes**

   - Progressive enhancement: if JavaScript is disabled, a static legend bar displays four coloured dots with labels (non‑interactive).
   - Legend state is persisted in local storage so user preferences survive reloads.

---

## 8. UX & UI Design

1. **Look & Feel**

   - Soft pastel colour palette reminiscent of Studio Ghibli films.
   - Whimsical, slightly animated transitions.
   - Rounded edges and gentle hover highlights.

2. **Responsive Design**

   - Adapt to mobile with a swipe‑friendly month navigation.
   - Scale down to a simpler UI where users can scroll through months vertically.
