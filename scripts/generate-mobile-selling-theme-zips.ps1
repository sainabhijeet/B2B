param(
  [string]$OutputRoot = "storage/themes/mobile/generated-selling"
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

function New-MobilePng([string]$Path, [string]$Title, [string]$Subtitle, [string]$Bg, [string]$Accent, [string]$Accent2, [string]$Kind) {
  Add-Type -AssemblyName System.Drawing
  $bmp = New-Object System.Drawing.Bitmap 900, 1200
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Bg))
  $accentBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Accent))
  $accent2Brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Accent2))
  $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245,255,255,255))
  $inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#111827"))
  $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#475569"))
  $g.FillRectangle($bgBrush, 0, 0, 900, 1200)
  $g.FillEllipse($accentBrush, 610, -90, 420, 420)
  $g.FillEllipse($accent2Brush, -140, 840, 420, 420)
  $g.FillRectangle($whiteBrush, 68, 92, 764, 940)
  $g.FillRectangle($accentBrush, 108, 172, 684, 330)

  if ($Kind -eq "fashion") {
    $g.FillEllipse($accent2Brush, 335, 238, 170, 170)
    $g.FillPolygon($whiteBrush, @(
      [System.Drawing.Point]::new(255, 650),
      [System.Drawing.Point]::new(645, 650),
      [System.Drawing.Point]::new(542, 366),
      [System.Drawing.Point]::new(358, 366)
    ))
  } elseif ($Kind -eq "grocery") {
    $g.FillEllipse($accent2Brush, 228, 300, 155, 155)
    $g.FillEllipse($whiteBrush, 388, 250, 190, 190)
    $g.FillRectangle($accent2Brush, 585, 350, 100, 190)
  } elseif ($Kind -eq "beauty") {
    $g.FillRectangle($whiteBrush, 280, 280, 118, 300)
    $g.FillRectangle($accent2Brush, 430, 220, 160, 360)
    $g.FillEllipse($whiteBrush, 574, 386, 104, 104)
  } elseif ($Kind -eq "electronics") {
    $g.FillRectangle($whiteBrush, 246, 218, 270, 470)
    $g.FillRectangle($accent2Brush, 536, 300, 118, 260)
    $g.FillEllipse($accentBrush, 330, 260, 72, 72)
  } else {
    $g.FillRectangle($whiteBrush, 230, 280, 440, 210)
    $g.FillRectangle($accent2Brush, 296, 390, 310, 210)
    $g.FillEllipse($accentBrush, 382, 220, 138, 138)
  }

  $titleFont = New-Object System.Drawing.Font "Arial", 44, ([System.Drawing.FontStyle]::Bold)
  $subFont = New-Object System.Drawing.Font "Arial", 24, ([System.Drawing.FontStyle]::Regular)
  $g.DrawString($Title, $titleFont, $inkBrush, 104, 720)
  $g.DrawString($Subtitle, $subFont, $mutedBrush, 106, 784)
  $g.FillRectangle($accent2Brush, 106, 860, 280, 72)
  $buttonFont = New-Object System.Drawing.Font "Arial", 22, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("Shop now", $buttonFont, $whiteBrush, 146, 880)
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
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
    @{ file = "hero.png"; title = $Spec.Name; subtitle = $Spec.Tagline; kind = $Spec.Kind },
    @{ file = "category-01.png"; title = $Spec.Categories[0]; subtitle = "Browse category"; kind = $Spec.Kind },
    @{ file = "category-02.png"; title = $Spec.Categories[1]; subtitle = "Fast discovery"; kind = $Spec.Kind },
    @{ file = "category-03.png"; title = $Spec.Categories[2]; subtitle = "Popular picks"; kind = $Spec.Kind },
    @{ file = "product-01.png"; title = $Spec.Products[0]; subtitle = "Featured seller"; kind = $Spec.Kind },
    @{ file = "product-02.png"; title = $Spec.Products[1]; subtitle = "Trending item"; kind = $Spec.Kind },
    @{ file = "product-03.png"; title = $Spec.Products[2]; subtitle = "Repeat order"; kind = $Spec.Kind },
    @{ file = "detail.png"; title = "Product detail"; subtitle = "Variants and checkout"; kind = $Spec.Kind }
  )
  foreach ($asset in $assets) {
    New-MobilePng -Path (Join-Path $imageDir $asset.file) -Title $asset.title -Subtitle $asset.subtitle -Bg $Spec.Bg -Accent $Spec.Accent -Accent2 $Spec.Accent2 -Kind $asset.kind
  }

  Write-Utf8NoBom -Path (Join-Path $cssDir "theme.css") -Content @"
:root {
  --theme-primary: $($Spec.Accent);
  --theme-secondary: $($Spec.Accent2);
  --theme-surface: $($Spec.Bg);
}
"@

  To-JsonFile @{ colors = @{ primary = $Spec.Accent; secondary = $Spec.Accent2; surface = $Spec.Bg; ink = "#111827"; muted = "#64748b" } } (Join-Path $tokensDir "colors.json")
  To-JsonFile @{ family = @{ heading = "Inter, Arial, sans-serif"; body = "Inter, Arial, sans-serif" } } (Join-Path $tokensDir "typography.json")
  To-JsonFile @{ container = "mobile"; radius = $Spec.Radius } (Join-Path $tokensDir "layout.json")
  To-JsonFile @{ section = "18px"; gap = "12px" } (Join-Path $tokensDir "spacing.json")

  $allowed = @(
    "header", "hero-banner", "promo-banner", "offer-strip", "campaign-banner",
    "category-grid", "product-grid", "featured-products", "new-arrivals",
    "best-sellers", "trending-products", "recommended-products",
    "product-gallery", "product-info", "image-with-text", "cta-banner",
    "icon-list", "footer"
  )
  $manifest = [ordered]@{
    name = $Spec.Name
    version = "1.0.0"
    storefrontKey = $slug
    industry = $Spec.Industry
    description = $Spec.Tagline
    mobile = @{
      base_layout = $Spec.Layout
      card_style = $Spec.CardStyle
      spacing = $Spec.Spacing
      show_banner = $true
      enable_quick_qty = $Spec.QuickQty
    }
    allowedSections = $allowed
    capabilities = @{ allowedSections = $allowed; variants = @{ "hero-banner" = @("app"); "footer" = @("bottom-bar") } }
    templates = @{ home = "templates/home.json"; category = "templates/category.json"; product = "templates/product.json" }
    tokens = @{ colors = "tokens/colors.json"; typography = "tokens/typography.json"; layout = "tokens/layout.json"; spacing = "tokens/spacing.json" }
    assets = @{ css = "assets/css/theme.css" }
  }
  To-JsonFile $manifest (Join-Path $themeDir "theme.json")

  $categoryImages = @("assets/images/category-01.png", "assets/images/category-02.png", "assets/images/category-03.png", "assets/images/detail.png")
  $productImages = @("assets/images/product-01.png", "assets/images/product-02.png", "assets/images/product-03.png", "assets/images/detail.png")
  $homeSections = @(
    @{ id = "header"; type = "header"; settings = @{ logoText = $Spec.ShortName; nav = @("Home", "Categories", "Cart", "Orders") } },
    @{ id = "hero"; type = "hero-banner"; settings = @{ title = $Spec.Headline; subtitle = $Spec.Tagline; primaryCta = $Spec.Cta; image = "assets/images/hero.png" } },
    @{ id = "categories"; type = "category-grid"; settings = @{ title = $Spec.CategoryTitle; subtitle = "Quick paths for mobile buyers."; images = $categoryImages } },
    @{ id = "products"; type = $Spec.ProductType; settings = @{ title = $Spec.ProductTitle; subtitle = "Demo visuals are included; tenant products render from catalog data."; images = $productImages } },
    @{ id = "promo"; type = $Spec.PromoType; settings = @{ title = $Spec.Promo; subtitle = "Optimized for mobile selling, repeat carts, and fast checkout." } },
    @{ id = "feature"; type = "image-with-text"; settings = @{ title = $Spec.FeatureTitle; body = $Spec.FeatureBody; image = "assets/images/detail.png"; imagePosition = "right" } },
    @{ id = "footer"; type = "footer"; variant = "bottom-bar"; settings = @{ items = @("Home", "Cart", "Orders", "Credit", "Settings", "Auth") } }
  )
  if ($Spec.Layout -eq "fast_order") {
    $homeSections = @($homeSections[0], $homeSections[1], $homeSections[3], $homeSections[2], $homeSections[4], $homeSections[6])
  } elseif ($Spec.Layout -eq "list") {
    $homeSections = @($homeSections[0], $homeSections[1], $homeSections[4], $homeSections[2], $homeSections[3], $homeSections[5], $homeSections[6])
  }
  To-JsonFile @{ sections = $homeSections } (Join-Path $templatesDir "home.json")
  To-JsonFile @{ sections = @(
    @{ id = "hero"; type = "hero-banner"; settings = @{ title = "$($Spec.ShortName) categories"; subtitle = "Browse products by category."; image = "assets/images/category-01.png" } },
    @{ id = "products"; type = $Spec.ProductType; settings = @{ title = "Category products"; images = $productImages } }
  ) } (Join-Path $templatesDir "category.json")
  To-JsonFile @{ sections = @(
    @{ id = "gallery"; type = "product-gallery"; settings = @{ title = "Product gallery"; images = $productImages } },
    @{ id = "info"; type = "product-info"; settings = @{ title = "Product detail"; subtitle = "Variants, pricing, stock, cart and checkout actions." } },
    @{ id = "related"; type = "recommended-products"; settings = @{ title = "Recommended"; images = $productImages } }
  ) } (Join-Path $templatesDir "product.json")

  Write-Utf8NoBom -Path (Join-Path $themeDir "README.txt") -Content "$($Spec.Name)`nMobile ecommerce app theme package."

  $zipPath = Join-Path $OutputRoot "$slug.zip"
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  Compress-Archive -Path (Join-Path $themeDir "*") -DestinationPath $zipPath -Force
  return $zipPath
}

$themes = @(
  @{ Name = "QuickKart Grocery Mobile"; ShortName = "QuickKart"; Industry = "grocery"; Kind = "grocery"; Layout = "fast_order"; CardStyle = "rounded"; Spacing = "compact"; QuickQty = $true; Bg = "#eefbf3"; Accent = "#15803d"; Accent2 = "#facc15"; Radius = "18px"; Headline = "Daily essentials, one-tap reorder."; Tagline = "A fast grocery app theme for staples, fresh items, and repeat carts."; Cta = "Start cart"; CategoryTitle = "Shop daily needs"; ProductTitle = "Fast moving products"; ProductType = "featured-products"; PromoType = "offer-strip"; Promo = "Fresh deals for repeat buyers"; FeatureTitle = "Built for quantity buying"; FeatureBody = "Large actions and quick-add flows help customers refill essentials faster."; Categories = @("Fresh", "Staples", "Snacks"); Products = @("Organic basket", "Rice pack", "Cold drink") },
  @{ Name = "StyleMart Fashion Mobile"; ShortName = "StyleMart"; Industry = "fashion"; Kind = "fashion"; Layout = "grid"; CardStyle = "rounded"; Spacing = "comfortable"; QuickQty = $false; Bg = "#fff1f2"; Accent = "#be123c"; Accent2 = "#f9a8d4"; Radius = "20px"; Headline = "Fashion drops made mobile-first."; Tagline = "A visual selling theme for apparel, footwear, and seasonal edits."; Cta = "Explore looks"; CategoryTitle = "Shop by style"; ProductTitle = "New arrivals"; ProductType = "new-arrivals"; PromoType = "campaign-banner"; Promo = "Seasonal styles with clean product cards"; FeatureTitle = "Lookbook-led commerce"; FeatureBody = "Big visuals and editorial cards make mobile fashion browsing feel premium."; Categories = @("Women", "Men", "Footwear"); Products = @("Denim jacket", "Sneaker pair", "Cotton shirt") },
  @{ Name = "BeautyGlow Mobile"; ShortName = "BeautyGlow"; Industry = "beauty"; Kind = "beauty"; Layout = "grid"; CardStyle = "rounded"; Spacing = "comfortable"; QuickQty = $false; Bg = "#faf5ff"; Accent = "#7e22ce"; Accent2 = "#f0abfc"; Radius = "22px"; Headline = "Beauty products with polished discovery."; Tagline = "A soft mobile theme for skincare, cosmetics, haircare, and bundles."; Cta = "Shop beauty"; CategoryTitle = "Shop routines"; ProductTitle = "Beauty best sellers"; ProductType = "best-sellers"; PromoType = "promo-banner"; Promo = "Routine bundles and product highlights"; FeatureTitle = "Routine-first selling"; FeatureBody = "Great for sets, ingredients, offers, and visual categories."; Categories = @("Skincare", "Makeup", "Haircare"); Products = @("Glow serum", "Matte lipstick", "Repair shampoo") },
  @{ Name = "GadgetHub Mobile"; ShortName = "GadgetHub"; Industry = "electronics"; Kind = "electronics"; Layout = "list"; CardStyle = "square"; Spacing = "compact"; QuickQty = $false; Bg = "#eff6ff"; Accent = "#1d4ed8"; Accent2 = "#22d3ee"; Radius = "10px"; Headline = "Electronics catalog for quick comparison."; Tagline = "List-first mobile selling for phones, accessories, and devices."; Cta = "Compare deals"; CategoryTitle = "Shop devices"; ProductTitle = "Tech picks"; ProductType = "trending-products"; PromoType = "deal-of-the-day"; Promo = "Deal-focused selling for gadgets"; FeatureTitle = "Specs stay scannable"; FeatureBody = "Compact rows make it easier to scan models, stock, and pricing."; Categories = @("Mobiles", "Audio", "Accessories"); Products = @("Smartphone", "Earbuds", "Power bank") },
  @{ Name = "MediCare Mobile Shop"; ShortName = "MediCare"; Industry = "health"; Kind = "grocery"; Layout = "list"; CardStyle = "rounded"; Spacing = "compact"; QuickQty = $true; Bg = "#ecfeff"; Accent = "#0f766e"; Accent2 = "#67e8f9"; Radius = "14px"; Headline = "Health essentials with simple ordering."; Tagline = "A calm mobile theme for pharmacy, wellness, and care products."; Cta = "Order essentials"; CategoryTitle = "Health categories"; ProductTitle = "Care essentials"; ProductType = "recommended-products"; PromoType = "offer-strip"; Promo = "Repeat medicine and wellness orders"; FeatureTitle = "Clear and practical"; FeatureBody = "Readable rows and fast actions support recurring purchases."; Categories = @("Wellness", "Care", "Devices"); Products = @("Vitamin pack", "First aid kit", "Thermometer") },
  @{ Name = "AutoParts Mobile"; ShortName = "AutoParts"; Industry = "automotive"; Kind = "electronics"; Layout = "fast_order"; CardStyle = "square"; Spacing = "compact"; QuickQty = $true; Bg = "#f8fafc"; Accent = "#334155"; Accent2 = "#f97316"; Radius = "8px"; Headline = "Parts ordering built for speed."; Tagline = "A B2B mobile theme for spare parts, accessories, and repeat SKUs."; Cta = "Find parts"; CategoryTitle = "Part groups"; ProductTitle = "Fast order parts"; ProductType = "product-grid"; PromoType = "promo-banner"; Promo = "Bulk order flow for workshops"; FeatureTitle = "Repeat-SKU friendly"; FeatureBody = "Quick quantity controls and dense rows fit distributor ordering."; Categories = @("Engine", "Tyres", "Tools"); Products = @("Brake pad", "Oil filter", "Toolkit") },
  @{ Name = "PetBasket Mobile"; ShortName = "PetBasket"; Industry = "pets"; Kind = "grocery"; Layout = "grid"; CardStyle = "rounded"; Spacing = "comfortable"; QuickQty = $false; Bg = "#fff7ed"; Accent = "#c2410c"; Accent2 = "#fdba74"; Radius = "20px"; Headline = "Pet supplies with friendly cards."; Tagline = "A warm mobile theme for food, toys, grooming, and care products."; Cta = "Shop pets"; CategoryTitle = "Shop by pet"; ProductTitle = "Popular pet picks"; ProductType = "featured-products"; PromoType = "campaign-banner"; Promo = "Monthly pet care bundles"; FeatureTitle = "Friendly product discovery"; FeatureBody = "Soft visuals and clear categories help buyers shop by pet need."; Categories = @("Food", "Toys", "Grooming"); Products = @("Dog food", "Cat toy", "Grooming kit") },
  @{ Name = "HomeFresh Kitchen Mobile"; ShortName = "HomeFresh"; Industry = "home"; Kind = "grocery"; Layout = "grid"; CardStyle = "rounded"; Spacing = "comfortable"; QuickQty = $false; Bg = "#f0fdf4"; Accent = "#16a34a"; Accent2 = "#86efac"; Radius = "18px"; Headline = "Kitchen and home products made easy."; Tagline = "A clean selling app theme for cookware, storage, and daily home goods."; Cta = "Shop home"; CategoryTitle = "Home categories"; ProductTitle = "Home essentials"; ProductType = "new-arrivals"; PromoType = "promo-banner"; Promo = "Home essentials in one place"; FeatureTitle = "Clear room-based selling"; FeatureBody = "Works well for mixed home and kitchen catalogs."; Categories = @("Cookware", "Storage", "Cleaning"); Products = @("Pan set", "Storage jar", "Cleaner pack") },
  @{ Name = "SportsPro Mobile"; ShortName = "SportsPro"; Industry = "sports"; Kind = "fashion"; Layout = "grid"; CardStyle = "square"; Spacing = "compact"; QuickQty = $false; Bg = "#f7fee7"; Accent = "#4d7c0f"; Accent2 = "#bef264"; Radius = "12px"; Headline = "Sports gear with bold mobile cards."; Tagline = "A high-energy theme for fitness, outdoor gear, sportswear, and equipment."; Cta = "Gear up"; CategoryTitle = "Shop sport"; ProductTitle = "Performance picks"; ProductType = "trending-products"; PromoType = "seasonal-sale"; Promo = "Season-ready sports products"; FeatureTitle = "Energetic selling flow"; FeatureBody = "Bold cards and strong CTAs suit gear-heavy catalogs."; Categories = @("Fitness", "Outdoor", "Shoes"); Products = @("Training shoes", "Yoga mat", "Gym bag") },
  @{ Name = "BookNest Mobile"; ShortName = "BookNest"; Industry = "books"; Kind = "beauty"; Layout = "list"; CardStyle = "rounded"; Spacing = "comfortable"; QuickQty = $false; Bg = "#f5f3ff"; Accent = "#5b21b6"; Accent2 = "#c4b5fd"; Radius = "16px"; Headline = "Books and stationery in a calm mobile shop."; Tagline = "A readable theme for books, office supplies, learning kits, and stationery."; Cta = "Browse books"; CategoryTitle = "Browse shelves"; ProductTitle = "Reader favorites"; ProductType = "recommended-products"; PromoType = "offer-strip"; Promo = "Bundles for readers and students"; FeatureTitle = "Readable product browsing"; FeatureBody = "List-led cards keep titles, authors, and prices easy to scan."; Categories = @("Books", "Stationery", "Learning"); Products = @("Novel set", "Notebook pack", "Pen kit") }
)

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$created = foreach ($theme in $themes) { New-Theme $theme }

$mobileRoot = "storage/themes/mobile"
foreach ($zip in $created) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($zip)
  $targetDir = Join-Path $mobileRoot $name
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Copy-Item -LiteralPath $zip -Destination (Join-Path $targetDir ([System.IO.Path]::GetFileName($zip))) -Force
  Copy-Item -LiteralPath $zip -Destination (Join-Path $mobileRoot ([System.IO.Path]::GetFileName($zip))) -Force
}

Write-Host "Created $($created.Count) mobile selling theme ZIPs:"
$created | ForEach-Object { Write-Host " - $_" }
