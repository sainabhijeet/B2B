param(
  [string]$OutputRoot = "storage/themes/web/generated-furniture"
)

$ErrorActionPreference = "Stop"

function Slugify([string]$value) {
  return ($value.ToLowerInvariant() -replace '[^a-z0-9]+', '-' -replace '(^-|-$)', '')
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath (Split-Path -Parent $Path)).Path + "\" + (Split-Path -Leaf $Path), $Content, $encoding)
}

function To-JsonFile($Value, [string]$Path, [int]$Depth = 20) {
  $json = $Value | ConvertTo-Json -Depth $Depth
  Write-Utf8NoBom -Path $Path -Content $json
}

function New-FurnitureSvg([string]$Title, [string]$Subtitle, [string]$Bg, [string]$Accent, [string]$Accent2, [string]$Shape) {
  $safeTitle = [System.Security.SecurityElement]::Escape($Title)
  $safeSubtitle = [System.Security.SecurityElement]::Escape($Subtitle)
  $shapeMarkup = switch ($Shape) {
    "sofa" {
      "<rect x='118' y='238' width='420' height='112' rx='32' fill='$Accent'/><rect x='146' y='188' width='164' height='82' rx='24' fill='$Accent2'/><rect x='342' y='188' width='164' height='82' rx='24' fill='#ffffff' opacity='.72'/><rect x='92' y='294' width='472' height='74' rx='28' fill='#111827' opacity='.12'/><circle cx='170' cy='392' r='18' fill='#1f2937'/><circle cx='488' cy='392' r='18' fill='#1f2937'/>"
    }
    "chair" {
      "<rect x='210' y='160' width='205' height='210' rx='34' fill='$Accent'/><rect x='180' y='265' width='265' height='88' rx='30' fill='$Accent2'/><path d='M214 354 L174 450 M412 354 L452 450' stroke='#1f2937' stroke-width='18' stroke-linecap='round'/><rect x='250' y='198' width='126' height='44' rx='18' fill='#ffffff' opacity='.65'/>"
    }
    "bed" {
      "<rect x='112' y='198' width='126' height='190' rx='28' fill='$Accent'/><rect x='206' y='238' width='390' height='150' rx='26' fill='$Accent2'/><rect x='236' y='260' width='142' height='48' rx='18' fill='#ffffff' opacity='.76'/><rect x='398' y='260' width='142' height='48' rx='18' fill='#ffffff' opacity='.55'/><path d='M114 390 H596' stroke='#1f2937' stroke-width='18' stroke-linecap='round' opacity='.75'/>"
    }
    "table" {
      "<ellipse cx='330' cy='252' rx='210' ry='62' fill='$Accent'/><rect x='292' y='284' width='78' height='158' rx='22' fill='$Accent2'/><ellipse cx='330' cy='454' rx='176' ry='32' fill='#111827' opacity='.14'/><circle cx='474' cy='198' r='42' fill='#ffffff' opacity='.7'/><circle cx='210' cy='212' r='28' fill='#ffffff' opacity='.45'/>"
    }
    "shelf" {
      "<rect x='158' y='126' width='330' height='330' rx='28' fill='$Accent'/><path d='M158 220 H488 M158 318 H488 M268 126 V456 M380 126 V456' stroke='#ffffff' stroke-width='18' opacity='.58'/><rect x='188' y='158' width='54' height='40' rx='10' fill='$Accent2'/><rect x='298' y='350' width='52' height='70' rx='12' fill='#111827' opacity='.22'/><circle cx='434' cy='270' r='26' fill='$Accent2'/>"
    }
    default {
      "<rect x='146' y='176' width='340' height='210' rx='42' fill='$Accent'/><rect x='196' y='224' width='240' height='92' rx='24' fill='$Accent2'/><path d='M214 390 H420' stroke='#1f2937' stroke-width='18' stroke-linecap='round' opacity='.55'/>"
    }
  }

  @"
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620" role="img" aria-label="$safeTitle">
  <rect width="900" height="620" fill="$Bg"/>
  <circle cx="760" cy="120" r="130" fill="$Accent" opacity=".18"/>
  <circle cx="104" cy="510" r="145" fill="$Accent2" opacity=".18"/>
  <g transform="translate(130 46)">
    <rect x="38" y="38" width="570" height="500" rx="46" fill="#ffffff" opacity=".74"/>
    <rect x="76" y="84" width="494" height="408" rx="34" fill="#ffffff" opacity=".52"/>
    $shapeMarkup
  </g>
  <text x="62" y="78" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" fill="#111827">$safeTitle</text>
  <text x="64" y="122" font-family="Inter, Arial, sans-serif" font-size="20" fill="#334155">$safeSubtitle</text>
</svg>
"@
}

function New-Theme($Spec) {
  $slug = Slugify $Spec.Name
  $themeDir = Join-Path $OutputRoot $slug
  $imageDir = Join-Path $themeDir "assets/images"
  $cssDir = Join-Path $themeDir "assets/css"
  $tokensDir = Join-Path $themeDir "tokens"
  $templatesDir = Join-Path $themeDir "templates"

  if (Test-Path -LiteralPath $themeDir) {
    Remove-Item -LiteralPath $themeDir -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $imageDir, $cssDir, $tokensDir, $templatesDir | Out-Null

  $assets = @(
    @{ file = "hero.svg"; title = $Spec.Name; subtitle = $Spec.Tagline; shape = $Spec.Shape },
    @{ file = "category-living.svg"; title = "Living room"; subtitle = "Sofas, tables, and TV units"; shape = "sofa" },
    @{ file = "category-dining.svg"; title = "Dining"; subtitle = "Tables, chairs, and benches"; shape = "table" },
    @{ file = "category-bedroom.svg"; title = "Bedroom"; subtitle = "Beds, wardrobes, and storage"; shape = "bed" },
    @{ file = "product-01.svg"; title = $Spec.Products[0]; subtitle = "Featured catalog item"; shape = "chair" },
    @{ file = "product-02.svg"; title = $Spec.Products[1]; subtitle = "Popular retail-ready SKU"; shape = "sofa" },
    @{ file = "product-03.svg"; title = $Spec.Products[2]; subtitle = "Fast moving furniture line"; shape = "shelf" },
    @{ file = "detail.svg"; title = "Material detail"; subtitle = "Finish, texture, and dimensions"; shape = $Spec.Shape }
  )
  foreach ($asset in $assets) {
    $svg = New-FurnitureSvg -Title $asset.title -Subtitle $asset.subtitle -Bg $Spec.Bg -Accent $Spec.Accent -Accent2 $Spec.Accent2 -Shape $asset.shape
    Write-Utf8NoBom -Path (Join-Path $imageDir $asset.file) -Content $svg
  }

  $css = @"
:root {
  --theme-primary: $($Spec.Accent);
  --theme-secondary: $($Spec.Accent2);
  --theme-surface: $($Spec.Bg);
}
.theme-$slug {
  background: $($Spec.Bg);
  color: #111827;
}
.theme-$slug .theme-section-root:first-child + .theme-section-root {
  border-top: 1px solid rgba(15, 23, 42, .08);
}
.theme-$slug img {
  object-fit: cover;
}
"@
  Write-Utf8NoBom -Path (Join-Path $cssDir "theme.css") -Content $css

  To-JsonFile @{
    colors = @{
      primary = $Spec.Accent
      secondary = $Spec.Accent2
      surface = $Spec.Bg
      ink = "#111827"
      muted = "#64748b"
    }
  } (Join-Path $tokensDir "colors.json")
  To-JsonFile @{
    family = @{
      heading = $Spec.Font
      body = "Inter, Arial, sans-serif"
    }
  } (Join-Path $tokensDir "typography.json")
  To-JsonFile @{
    container = "1120px"
    radius = $Spec.Radius
  } (Join-Path $tokensDir "layout.json")
  To-JsonFile @{
    section = "56px"
    gap = "24px"
  } (Join-Path $tokensDir "spacing.json")

  $allowed = @(
    "header", "hero-banner", "hero-split", "promo-banner", "offer-strip",
    "campaign-banner", "seasonal-sale", "deal-of-the-day", "category-grid",
    "filter-sidebar", "product-grid", "featured-products", "new-arrivals",
    "best-sellers", "trending-products", "recommended-products", "related-products",
    "product-carousel", "product-slider", "product-gallery", "product-info",
    "image-with-text", "image-gallery", "brand-slider", "testimonial-slider",
    "cta-banner", "newsletter", "faq-section", "rich-text", "icon-list",
    "divider", "spacer", "footer"
  )

  $manifest = [ordered]@{
    name = $Spec.Name
    version = "2.0.0"
    storefrontKey = $slug
    industry = "furniture"
    description = $Spec.Tagline
    allowedSections = $allowed
    capabilities = @{
      allowedSections = $allowed
      variants = @{
        "hero-banner" = @("default")
        "footer" = @("columns")
      }
    }
    templates = @{
      home = "templates/home.json"
      category = "templates/category.json"
      product = "templates/product.json"
    }
    tokens = @{
      colors = "tokens/colors.json"
      typography = "tokens/typography.json"
      layout = "tokens/layout.json"
      spacing = "tokens/spacing.json"
    }
    assets = @{
      css = "assets/css/theme.css"
    }
  }
  To-JsonFile $manifest (Join-Path $themeDir "theme.json")

  $categoryImages = @(
    "assets/images/category-living.svg",
    "assets/images/category-dining.svg",
    "assets/images/category-bedroom.svg",
    "assets/images/detail.svg"
  )
  $productImages = @(
    "assets/images/product-01.svg",
    "assets/images/product-02.svg",
    "assets/images/product-03.svg",
    "assets/images/detail.svg"
  )

  $homeSections = @(
    @{ id = "header"; type = "header"; settings = @{ logoText = $Spec.ShortName; nav = @("Home", "Rooms", "Catalog", "Offers", "Cart", "Login") } },
    @{ id = "hero"; type = $Spec.HeroType; settings = @{ title = $Spec.Headline; subtitle = $Spec.Tagline; primaryCta = "Shop furniture"; secondaryCta = "View rooms"; image = "assets/images/hero.svg" } },
    @{ id = "promo"; type = $Spec.PromoType; settings = @{ title = $Spec.Promo; subtitle = "Built for fast catalog browsing, B2B ordering, and clean storefront previews." } },
    @{ id = "categories"; type = "category-grid"; settings = @{ title = $Spec.CategoryTitle; subtitle = "Different room collections with clear visual entry points."; images = $categoryImages } },
    @{ id = "feature"; type = $Spec.FeatureType; settings = @{ title = $Spec.FeatureTitle; body = $Spec.FeatureBody; image = "assets/images/detail.svg"; imagePosition = $Spec.ImagePosition } },
    @{ id = "products"; type = $Spec.ProductType; settings = @{ title = $Spec.ProductTitle; subtitle = "These visuals are theme demo assets; live products come from tenant catalog."; images = $productImages } },
    @{ id = "benefits"; type = "icon-list"; settings = @{ title = "Buyer-friendly furniture commerce"; items = @(
      @{ icon = "01"; title = "Room-first discovery"; text = "Guide buyers by living, dining, bedroom, office, and outdoor collections." },
      @{ icon = "02"; title = "Large product visuals"; text = "Designed to show materials, shapes, and catalog families clearly." },
      @{ icon = "03"; title = "Trade order flow"; text = "Works with tenant pricing, cart, orders, and invoice-ready checkout." }
    ) } },
    @{ id = "testimonials"; type = "testimonial-slider"; settings = @{ title = "Retailer notes"; items = @(
      @{ quote = "Clean room-based browsing made repeat furniture ordering much faster."; author = "Dealer partner" },
      @{ quote = "The catalog feels premium without slowing buyers down."; author = "Store owner" }
    ) } },
    @{ id = "newsletter"; type = "newsletter"; settings = @{ title = "Share seasonal furniture drops"; subtitle = "Use this block for restocks, catalog updates, and trade offers." } },
    @{ id = "footer"; type = "footer"; variant = "columns"; settings = @{ columns = @(
      @{ heading = "Shop"; links = @("Living", "Dining", "Bedroom", "Office") },
      @{ heading = "Account"; links = @("Login", "Orders", "Cart") },
      @{ heading = "Support"; links = @("Shipping", "Returns", "Warranty") }
    ) } }
  )
  if ($Spec.Layout -eq "gallery-first") {
    $homeSections = @($homeSections[0], $homeSections[1], @{ id = "gallery"; type = "image-gallery"; settings = @{ title = "Lookbook"; images = $productImages } }) + $homeSections[2..($homeSections.Count - 1)]
  } elseif ($Spec.Layout -eq "story-first") {
    $homeSections = @($homeSections[0], $homeSections[1], $homeSections[4], $homeSections[2], $homeSections[3], $homeSections[5], $homeSections[6], $homeSections[8], $homeSections[9])
  } elseif ($Spec.Layout -eq "catalog-first") {
    $homeSections = @($homeSections[0], $homeSections[1], $homeSections[5], $homeSections[3], $homeSections[2], $homeSections[4], $homeSections[6], $homeSections[9])
  }
  To-JsonFile @{ sections = $homeSections } (Join-Path $templatesDir "home.json")

  $categoryTemplate = @{
    sections = @(
      @{ id = "header"; type = "header"; settings = @{ logoText = $Spec.ShortName; nav = @("Home", "Catalog", "Cart", "Login") } },
      @{ id = "category-hero"; type = "hero-banner"; settings = @{ title = "$($Spec.ShortName) room catalog"; subtitle = "Browse furniture by room, finish, material, and product family."; image = "assets/images/category-living.svg" } },
      @{ id = "filters"; type = "filter-sidebar"; settings = @{ title = "Filter furniture"; message = "Room, finish, color, material, and price filters." } },
      @{ id = "products"; type = "product-grid"; settings = @{ title = "Room-ready products"; subtitle = "Tenant catalog products render here."; images = $productImages } },
      @{ id = "cta"; type = "cta-banner"; settings = @{ title = "Need a bulk quote?"; subtitle = "Sign in and place a trade order with configured pricing." } },
      @{ id = "footer"; type = "footer"; variant = "columns"; settings = @{ columns = @(
        @{ heading = "Collections"; links = @("Sofas", "Tables", "Beds") },
        @{ heading = "Help"; links = @("Contact", "Delivery", "Returns") }
      ) } }
    )
  }
  To-JsonFile $categoryTemplate (Join-Path $templatesDir "category.json")

  $productTemplate = @{
    sections = @(
      @{ id = "header"; type = "header"; settings = @{ logoText = $Spec.ShortName; nav = @("Home", "Catalog", "Cart", "Login") } },
      @{ id = "gallery"; type = "product-gallery"; settings = @{ title = "Product gallery"; images = $productImages } },
      @{ id = "info"; type = "product-info"; settings = @{ title = "Furniture detail"; subtitle = "Dimensions, materials, variants, pricing, and checkout actions render from catalog data." } },
      @{ id = "story"; type = "image-with-text"; settings = @{ title = "Made for room planning"; body = "Use rich imagery and direct product information to help buyers decide quickly."; image = "assets/images/detail.svg"; imagePosition = "left" } },
      @{ id = "related"; type = "related-products"; settings = @{ title = "Pairs well with"; subtitle = "Related furniture lines for the same room."; images = $productImages } },
      @{ id = "faq"; type = "faq-section"; settings = @{ title = "Furniture buying notes"; items = @(
        @{ question = "Can buyers order variants?"; answer = "Yes, product variants and pricing come from tenant catalog data." },
        @{ question = "Can this support bulk orders?"; answer = "Yes, it is designed for distributor-led ecommerce flows." }
      ) } },
      @{ id = "footer"; type = "footer"; variant = "columns"; settings = @{ columns = @(
        @{ heading = "Product"; links = @("Details", "Related", "Cart") },
        @{ heading = "Support"; links = @("Warranty", "Shipping", "Contact") }
      ) } }
    )
  }
  To-JsonFile $productTemplate (Join-Path $templatesDir "product.json")

  Write-Utf8NoBom -Path (Join-Path $themeDir "README.txt") -Content @"
$($Spec.Name)

Furniture ecommerce theme ZIP for the storefront JSON engine.

Includes:
- theme.json
- templates/home.json, templates/category.json, templates/product.json
- SVG demo images with unique furniture compositions
- token JSON files and runtime CSS
"@

  $zipPath = Join-Path $OutputRoot "$slug.zip"
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  Compress-Archive -Path (Join-Path $themeDir "*") -DestinationPath $zipPath -Force
  return $zipPath
}

$themes = @(
  @{ Name = "Urban Loft Furniture"; ShortName = "Urban Loft"; Headline = "Industrial furniture for modern apartments."; Tagline = "Concrete tones, compact layouts, and bold product cards for city homes."; Promo = "Apartment-ready furniture with fast visual scanning"; CategoryTitle = "Shop by urban room"; ProductTitle = "Loft-ready furniture"; FeatureTitle = "Compact rooms, strong silhouettes"; FeatureBody = "A darker editorial rhythm with roomy product tiles and practical category browsing."; Bg = "#eef2f7"; Accent = "#3f5168"; Accent2 = "#d9a441"; Font = "Inter, Arial, sans-serif"; Radius = "14px"; Shape = "sofa"; HeroType = "hero-banner"; PromoType = "promo-banner"; FeatureType = "image-with-text"; ProductType = "product-grid"; ImagePosition = "right"; Layout = "catalog-first"; Products = @("Rivet lounge chair", "Metro sofa", "Ironline shelf") },
  @{ Name = "Scandi Nest Furniture"; ShortName = "Scandi Nest"; Headline = "Soft wood, quiet rooms, better browsing."; Tagline = "Light surfaces, airy whitespace, and warm family-friendly furniture collections."; Promo = "Natural finishes | Soft textiles | Minimal product discovery"; CategoryTitle = "Calm room collections"; ProductTitle = "Nordic best sellers"; FeatureTitle = "Gentle catalog flow"; FeatureBody = "A clean layout for brands selling minimal furniture with natural textures."; Bg = "#f6f3ea"; Accent = "#88a390"; Accent2 = "#d6b27c"; Font = "Georgia, serif"; Radius = "18px"; Shape = "chair"; HeroType = "hero-banner"; PromoType = "offer-strip"; FeatureType = "image-with-text"; ProductType = "new-arrivals"; ImagePosition = "left"; Layout = "story-first"; Products = @("Ashwood chair", "Cloud sofa", "Oak display unit") },
  @{ Name = "Luxe Living Furniture"; ShortName = "Luxe Living"; Headline = "Premium furniture with showroom energy."; Tagline = "High contrast cards, polished hero imagery, and elegant room storytelling."; Promo = "Luxury room sets | Premium finishes | Concierge-ready catalog"; CategoryTitle = "Curated luxury rooms"; ProductTitle = "Signature pieces"; FeatureTitle = "Showroom-style selling"; FeatureBody = "A premium layout for high-value furniture and decor collections."; Bg = "#f7f1ec"; Accent = "#1f2937"; Accent2 = "#c9a45c"; Font = "Georgia, serif"; Radius = "10px"; Shape = "table"; HeroType = "hero-banner"; PromoType = "campaign-banner"; FeatureType = "image-with-text"; ProductType = "featured-products"; ImagePosition = "right"; Layout = "gallery-first"; Products = @("Marble console", "Velvet sectional", "Brass bookcase") },
  @{ Name = "Modular Home Furniture"; ShortName = "Modular Home"; Headline = "Flexible furniture for changing spaces."; Tagline = "Grid-led navigation for modular sofas, shelves, workstations, and storage."; Promo = "Modular systems | Easy combinations | Repeat ordering"; CategoryTitle = "Build your room system"; ProductTitle = "Modular catalog"; FeatureTitle = "Designed around combinations"; FeatureBody = "Structured cards and system-focused visuals help buyers combine products."; Bg = "#eef7f3"; Accent = "#20756b"; Accent2 = "#8fd3c7"; Font = "Inter, Arial, sans-serif"; Radius = "12px"; Shape = "shelf"; HeroType = "hero-split"; PromoType = "promo-banner"; FeatureType = "rich-text"; ProductType = "product-carousel"; ImagePosition = "right"; Layout = "catalog-first"; Products = @("Stack module", "Flex sofa", "Grid storage") },
  @{ Name = "Office Studio Furniture"; ShortName = "Office Studio"; Headline = "Workspace furniture for serious teams."; Tagline = "A practical B2B view for desks, ergonomic chairs, meeting tables, and storage."; Promo = "Bulk-ready office catalog | Trade ordering | Clean specs"; CategoryTitle = "Shop workspace zones"; ProductTitle = "Office essentials"; FeatureTitle = "Clear specs for teams"; FeatureBody = "A work-focused layout that prioritizes scanability and repeat procurement."; Bg = "#f2f6fb"; Accent = "#2563eb"; Accent2 = "#93c5fd"; Font = "Inter, Arial, sans-serif"; Radius = "8px"; Shape = "chair"; HeroType = "hero-banner"; PromoType = "offer-strip"; FeatureType = "image-with-text"; ProductType = "best-sellers"; ImagePosition = "left"; Layout = "catalog-first"; Products = @("Task chair", "Bench desk", "Archive cabinet") },
  @{ Name = "Outdoor Patio Furniture"; ShortName = "Patio House"; Headline = "Outdoor furniture built for open-air selling."; Tagline = "Bright product imagery for patio sets, garden chairs, umbrellas, and loungers."; Promo = "Weather-ready collections | Seasonal drops | Patio bundles"; CategoryTitle = "Outdoor zones"; ProductTitle = "Patio picks"; FeatureTitle = "Seasonal visual merchandising"; FeatureBody = "A breezy layout for garden and outdoor furniture ecommerce."; Bg = "#edf8ef"; Accent = "#2f7d48"; Accent2 = "#f4c95d"; Font = "Inter, Arial, sans-serif"; Radius = "16px"; Shape = "table"; HeroType = "hero-banner"; PromoType = "seasonal-sale"; FeatureType = "image-with-text"; ProductType = "trending-products"; ImagePosition = "right"; Layout = "gallery-first"; Products = @("Garden lounger", "Patio set", "Outdoor rack") },
  @{ Name = "Kids Room Furniture"; ShortName = "Kids Room"; Headline = "Playful furniture for growing rooms."; Tagline = "Soft color blocks, friendly product cards, and clear room categories for kids collections."; Promo = "Safe edges | Storage-friendly | Colorful room sets"; CategoryTitle = "Shop kids spaces"; ProductTitle = "Kids room favorites"; FeatureTitle = "Friendly and practical"; FeatureBody = "A bright catalog for beds, desks, storage, and playful room furniture."; Bg = "#fff4f7"; Accent = "#e879a6"; Accent2 = "#8bd3dd"; Font = "Inter, Arial, sans-serif"; Radius = "22px"; Shape = "bed"; HeroType = "hero-banner"; PromoType = "promo-banner"; FeatureType = "image-with-text"; ProductType = "new-arrivals"; ImagePosition = "left"; Layout = "story-first"; Products = @("Study desk", "Bunk bed", "Toy shelf") },
  @{ Name = "Mattress Sleep Furniture"; ShortName = "Sleep Co."; Headline = "Beds, mattresses, and calm sleep products."; Tagline = "A soft ecommerce theme for bedroom furniture, sleep accessories, and comfort-led catalogues."; Promo = "Comfort-led browsing | Bedroom bundles | Easy reorder"; CategoryTitle = "Sleep collections"; ProductTitle = "Bedroom best sellers"; FeatureTitle = "Comfort-first product detail"; FeatureBody = "A calm shopping flow for mattress and bedroom furniture retailers."; Bg = "#eef4ff"; Accent = "#6677cc"; Accent2 = "#bcc7ff"; Font = "Georgia, serif"; Radius = "18px"; Shape = "bed"; HeroType = "hero-split"; PromoType = "promo-banner"; FeatureType = "rich-text"; ProductType = "featured-products"; ImagePosition = "right"; Layout = "story-first"; Products = @("Hybrid mattress", "Platform bed", "Linen cabinet") },
  @{ Name = "Artisan Decor Furniture"; ShortName = "Artisan Decor"; Headline = "Handcrafted furniture and decor with texture."; Tagline = "Warm editorial sections for carved tables, woven chairs, cabinets, and craft-led collections."; Promo = "Craft stories | Natural finishes | Boutique catalog"; CategoryTitle = "Artisan categories"; ProductTitle = "Handmade highlights"; FeatureTitle = "Story-led shopping"; FeatureBody = "A richer editorial view for handcrafted furniture and decor brands."; Bg = "#fbf3e7"; Accent = "#9a5b2f"; Accent2 = "#d9a66b"; Font = "Georgia, serif"; Radius = "12px"; Shape = "shelf"; HeroType = "hero-banner"; PromoType = "campaign-banner"; FeatureType = "image-with-text"; ProductType = "product-carousel"; ImagePosition = "right"; Layout = "gallery-first"; Products = @("Cane chair", "Carved console", "Clay display shelf") },
  @{ Name = "Rental Staging Furniture"; ShortName = "Stage Rent"; Headline = "Furniture rental catalog for staged spaces."; Tagline = "Fast room bundles, practical product grids, and clean CTAs for rental-ready furniture."; Promo = "Room packages | Fast selection | Rental-ready views"; CategoryTitle = "Staging packages"; ProductTitle = "Rental-ready pieces"; FeatureTitle = "Packages over single products"; FeatureBody = "A conversion-focused view for rental, staging, and event furniture catalogs."; Bg = "#f3f4f6"; Accent = "#475569"; Accent2 = "#f97316"; Font = "Inter, Arial, sans-serif"; Radius = "10px"; Shape = "sofa"; HeroType = "hero-banner"; PromoType = "deal-of-the-day"; FeatureType = "image-with-text"; ProductType = "recommended-products"; ImagePosition = "left"; Layout = "catalog-first"; Products = @("Stage sofa", "Event chair", "Rental shelf") }
)

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$created = foreach ($theme in $themes) {
  New-Theme $theme
}

Write-Host "Created $($created.Count) furniture theme ZIPs:"
$created | ForEach-Object { Write-Host " - $_" }
