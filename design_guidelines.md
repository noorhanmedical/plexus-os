# Design Guidelines: Shell

## Design Approach
**Selected Framework:** Design System + Reference Hybrid  
**Primary Inspiration:** Linear, Vercel, Arc Browser (Modern, refined technical aesthetic)  
**Design Philosophy:** Sophisticated minimalism with precise attention to detail

## Core Design Elements

### Typography
- **Primary Font:** Inter (Google Fonts) - clean, modern, excellent readability
- **Display/Hero:** 56-72px, font-weight-700, tracking-tight
- **Headings:** H1: 36px/700, H2: 28px/600, H3: 20px/600
- **Body:** 16px/400, line-height relaxed
- **Small/Meta:** 14px/400

### Layout System
**Spacing Units:** Tailwind 4, 6, 8, 12, 16, 24 for consistency  
**Container:** max-w-7xl with px-6 for standard sections  
**Section Padding:** py-24 desktop, py-16 mobile  
**Grid System:** 12-column grid, gap-6 standard

### Component Library

**Navigation:**
- Fixed header with backdrop-blur-lg
- Logo left, navigation center, CTA right
- Height: h-16
- Border bottom: border-b with subtle separation

**Hero Section:**
- 70vh height, centered content
- Large hero image (full-bleed, subtle overlay)
- Headline + subheadline + dual CTA layout
- Buttons on image: backdrop-blur-md bg-white/10 border border-white/20

**Cards:**
- Rounded corners: rounded-xl
- Borders: border with subtle shadow
- Hover: subtle lift (translate-y-1) with shadow increase
- Padding: p-6 or p-8

**Buttons:**
- Primary: Solid, rounded-lg, px-6 py-3
- Secondary: Outlined, same dimensions
- Text: Minimal padding, underline on hover
- All implement standard hover/active states

**Forms:**
- Input fields: border rounded-lg, px-4 py-3
- Focus rings: 2px offset
- Labels: font-weight-500, mb-2
- Consistent spacing between fields: gap-4

**Footer:**
- Four-column grid (desktop), stack mobile
- Newsletter signup, navigation groups, social links, legal
- py-16, border-top

### Animations
**Use Sparingly:**
- Subtle fade-in on scroll for key sections only
- Smooth transitions on interactive elements (duration-200)
- Hero entrance: minimal fade + slight upward movement
- No complex scroll-triggered animations

## Images

**Hero Image:**
- Large, full-width hero image required
- Abstract/geometric technical aesthetic (circuit patterns, gradients, or clean architectural photography)
- Placement: Background of hero section with subtle dark overlay (opacity-40)
- Dimensions: Minimum 1920x1080

**Supporting Images:**
- Feature section: 2-3 product screenshots or isometric illustrations
- Placement: Alternating left/right in feature sections
- Style: Clean, modern with subtle shadows

**Team/About (if applicable):**
- Professional headshots, rounded-full or rounded-lg
- Grid layout: 3-4 columns

## Page Structure (Landing)

1. **Navigation** (Fixed)
2. **Hero** (70vh with background image)
3. **Features Grid** (3 columns, icons + text)
4. **Product Showcase** (2-column alternating image/text, 3 sections)
5. **Stats/Metrics** (4-column centered)
6. **Testimonials** (2-column grid, 4 total)
7. **CTA Section** (Centered, gradient background)
8. **Footer** (4-column)

## Key Principles
- Generous whitespace - never cramped
- Precise alignment and consistent spacing
- Subtle depth through shadows, not heavy effects
- Content hierarchy through scale and weight, not color alone
- Every section serves a purpose - no filler content
- Mobile-first responsive approach: single column below md breakpoint