param(
  [string]$OutputRoot = "exports/industry-theme-zips"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$outputFull = if ([System.IO.Path]::IsPathRooted($OutputRoot)) {
  [System.IO.Path]::GetFullPath($OutputRoot)
} else {
  [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputRoot))
}

function Assert-ChildPath([string]$Parent, [string]$Candidate) {
  $parentFull = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
  $candidateFull = [System.IO.Path]::GetFullPath($Candidate)
  if (-not $candidateFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe path outside expected parent: $candidateFull"
  }
}

Assert-ChildPath -Parent $repoRoot -Candidate $outputFull

function Slugify([string]$Value) {
  return ($Value.ToLowerInvariant() -replace '[^a-z0-9]+', '-' -replace '(^-|-$)', '')
}

function XmlEscape([string]$Value) {
  return [System.Security.SecurityElement]::Escape($Value)
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  [System.IO.File]::WriteAllText(
    [System.IO.Path]::GetFullPath($Path),
    $Content,
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Write-JsonFile($Value, [string]$Path, [int]$Depth = 30) {
  Write-Utf8NoBom -Path $Path -Content (($Value | ConvertTo-Json -Depth $Depth) + "`n")
}

function New-IndustrySpec(
  [int]$Order,
  [string]$Name,
  [string]$Categories,
  [string]$Products
) {
  return [ordered]@{
    Order = $Order
    IndustryId = "10000000-0000-4000-8000-{0:x12}" -f $Order
    Name = $Name
    Categories = @($Categories.Split('|') | ForEach-Object { $_.Trim() })
    Products = @($Products.Split('|') | ForEach-Object { $_.Trim() })
  }
}

$industries = @(
  (New-IndustrySpec 1 'Electronics' 'Mobile Phones|Computers|Audio & Video|Electronic Accessories' 'Pro Smartphone|Business Laptop|Wireless Earbuds|4K Smart Display|Wi-Fi Router|Power Bank'),
  (New-IndustrySpec 2 'Footwear' 'Formal Shoes|Sports Shoes|Safety Footwear|Sandals & Slippers' 'Leather Oxford Shoes|Performance Sneakers|Steel Toe Boots|Comfort Sandals|Canvas Trainers|Worksite Gumboots'),
  (New-IndustrySpec 3 'Textile' 'Fabrics|Apparel Basics|Home Textiles|Yarns & Threads' 'Premium Cotton Roll|Linen Shirt Pack|Hotel Towel Set|Polyester Yarn Cone|Denim Fabric Bolt|Printed Kurti Material'),
  (New-IndustrySpec 4 'Industrial Equipment' 'Material Handling|Workshop Equipment|Automation|Measuring Tools' 'Hydraulic Pallet Truck|Industrial Air Compressor|Control Panel Unit|Digital Caliper|Bench Grinder|Warehouse Trolley'),
  (New-IndustrySpec 5 'Machinery' 'CNC Machines|Packaging Machines|Machine Components|Maintenance Tools' 'CNC Milling Center|Automatic Sealer|Precision Ball Screw|Industrial Gearbox|Lathe Chuck Set|Machine Lubrication Pump'),
  (New-IndustrySpec 6 'Jewelry / Diamond' 'Gold Jewelry|Diamond Jewelry|Silver Articles|Loose Gemstones' 'Diamond Solitaire Ring|Gold Chain Collection|Silver Gift Bowl|Emerald Gemstone|Bridal Necklace Set|Diamond Stud Earrings'),
  (New-IndustrySpec 7 'General Commerce' 'Daily Essentials|Business Supplies|Home Utility|Seasonal Deals' 'Multipurpose Storage Box|Office Starter Kit|Travel Bottle Set|LED Desk Lamp|Utility Tool Set|Festive Gift Hamper'),
  (New-IndustrySpec 8 'Automotive & Spare Parts' 'Engine Parts|Braking Systems|Filters & Lubricants|Workshop Tools' 'Premium Brake Pad Set|Heavy Duty Oil Filter|Engine Timing Belt|Synthetic Motor Oil|Clutch Plate Assembly|Mechanic Tool Kit'),
  (New-IndustrySpec 9 'FMCG & Packaged Foods' 'Staples|Snacks & Beverages|Personal Care|Home Care' 'Basmati Rice Bag|Assorted Snack Carton|Premium Tea Pack|Bath Soap Case|Floor Cleaner Can|Cooking Oil Jar'),
  (New-IndustrySpec 10 'Pharmaceuticals & Healthcare' 'Prescription Medicines|OTC Care|Wellness|Hospital Supplies' 'Paracetamol Tablets|Vitamin Supplement Pack|Digital Thermometer|First Aid Refill|Antiseptic Solution|Wellness Protein Jar'),
  (New-IndustrySpec 11 'Medical Devices & Diagnostics' 'Diagnostic Equipment|Patient Monitoring|Medical Disposables|Clinical Furniture' 'Portable ECG Monitor|Digital BP Machine|Sterile Syringe Box|Patient Examination Bed|Pulse Oximeter|Diagnostic Test Kit'),
  (New-IndustrySpec 12 'Beauty & Personal Care' 'Skin Care|Hair Care|Cosmetics|Salon Supplies' 'Vitamin C Face Serum|Repair Shampoo|Matte Lip Color|Salon Facial Kit|Herbal Body Lotion|Professional Hair Dryer'),
  (New-IndustrySpec 13 'Agriculture, Seeds & Agri-inputs' 'Seeds|Fertilizers|Crop Protection|Farm Tools' 'Hybrid Maize Seeds|Organic Growth Fertilizer|Crop Protection Spray|Manual Seed Planter|Drip Irrigation Kit|Soil Testing Meter'),
  (New-IndustrySpec 14 'Construction & Building Materials' 'Cement & Concrete|Steel & Structure|Bricks & Blocks|Waterproofing' 'Premium Cement Bag|TMT Steel Bar Bundle|AAC Building Blocks|Waterproofing Compound|Ready Mix Mortar|Construction Sand Pack'),
  (New-IndustrySpec 15 'Paints, Coatings & Adhesives' 'Interior Paints|Industrial Coatings|Wood Finishes|Adhesives & Sealants' 'Luxury Interior Emulsion|Anti-Corrosion Primer|PU Wood Finish|Construction Adhesive|Silicone Sealant|Epoxy Floor Coating'),
  (New-IndustrySpec 16 'Chemicals & Specialty Materials' 'Industrial Chemicals|Solvents|Specialty Additives|Cleaning Chemicals' 'Industrial Grade Solvent|Food Safe Additive|Performance Catalyst|Degreasing Chemical|Water Treatment Compound|Specialty Resin Drum'),
  (New-IndustrySpec 17 'Plastics & Polymers' 'Polymer Resins|Masterbatches|Engineering Plastics|Recycled Materials' 'PP Resin Granules|Black Masterbatch|ABS Engineering Polymer|Recycled PET Flakes|PVC Compound|Nylon Polymer Chips'),
  (New-IndustrySpec 18 'Paper & Packaging' 'Corrugated Packaging|Flexible Packaging|Labels|Paper Products' 'Five Ply Shipping Box|Printed Pouch Roll|Barcode Label Pack|Kraft Paper Reel|Food Packaging Tray|Protective Bubble Roll'),
  (New-IndustrySpec 19 'Printing & Stationery' 'Printing Supplies|Office Paper|Writing Instruments|Binding Materials' 'CMYK Ink Set|A4 Copier Paper Case|Premium Pen Box|Spiral Binding Coil|Thermal Paper Roll|Executive Notebook Pack'),
  (New-IndustrySpec 20 'Furniture & Wood Products' 'Living Room|Bedroom|Office Furniture|Wood Panels' 'Modern Three Seat Sofa|Solid Wood Bed|Ergonomic Office Chair|Plywood Sheet Bundle|Dining Table Set|Modular Storage Cabinet'),
  (New-IndustrySpec 21 'Home Decor & Furnishings' 'Wall Decor|Lighting Decor|Soft Furnishings|Decor Accessories' 'Textured Wall Art|Designer Pendant Lamp|Premium Cushion Set|Decorative Table Vase|Blackout Curtain Pair|Handwoven Floor Rug'),
  (New-IndustrySpec 22 'Kitchenware & Cookware' 'Cookware|Kitchen Tools|Storage|Small Appliances' 'Tri-Ply Cookware Set|Chef Knife Collection|Airtight Container Set|Mixer Grinder|Stainless Steel Bottle|Nonstick Frying Pan'),
  (New-IndustrySpec 23 'Electrical & Lighting' 'Switchgear|Cables & Wires|LED Lighting|Electrical Accessories' 'MCB Distribution Box|Copper Wire Coil|LED Panel Light|Industrial Plug Set|Smart Switch Module|Outdoor Flood Light'),
  (New-IndustrySpec 24 'HVAC & Refrigeration' 'Air Conditioning|Refrigeration|Ventilation|HVAC Components' 'Commercial Split AC|Cold Room Condenser|Industrial Exhaust Fan|Copper Coil Roll|Digital Thermostat|Refrigeration Compressor'),
  (New-IndustrySpec 25 'Pumps, Valves & Pipe Fittings' 'Industrial Pumps|Control Valves|Pipe Fittings|Water Systems' 'Centrifugal Water Pump|Stainless Ball Valve|GI Elbow Fitting|Pressure Booster System|Chemical Dosing Pump|Flanged Gate Valve'),
  (New-IndustrySpec 26 'Tools & Hardware' 'Hand Tools|Power Tools|Fasteners|Builder Hardware' 'Professional Spanner Set|Cordless Drill Machine|Hex Bolt Carton|Door Hardware Kit|Angle Grinder|Industrial Cutting Pliers'),
  (New-IndustrySpec 27 'Industrial Safety & PPE' 'Head Protection|Hand Protection|Fall Protection|Workwear' 'Safety Helmet Case|Cut Resistant Gloves|Full Body Harness|Reflective Safety Jacket|Industrial Safety Shoes|Respirator Mask Box'),
  (New-IndustrySpec 28 'Logistics, Warehousing & 3PL' 'Storage Systems|Material Movement|Packaging Operations|Tracking Supplies' 'Heavy Duty Storage Rack|Warehouse Hand Pallet|Stretch Wrap Roll|Barcode Scanner|Plastic Pallet|Shipping Label Bundle'),
  (New-IndustrySpec 29 'Office Supplies & B2B Stationery' 'Desk Supplies|Filing & Storage|Paper Products|Meeting Supplies' 'Corporate Stationery Kit|Lever Arch File Box|Copier Paper Carton|Magnetic Whiteboard|Desktop Organizer|Permanent Marker Pack'),
  (New-IndustrySpec 30 'IT Hardware & Networking Distribution' 'Servers & Storage|Networking|Computing|Peripherals' 'Rack Server Unit|Managed Network Switch|Business Desktop PC|Enterprise SSD|Wireless Access Point|Keyboard Mouse Combo'),
  (New-IndustrySpec 31 'Consumer Appliances & Home Tech' 'Kitchen Appliances|Home Appliances|Smart Home|Climate Control' 'Double Door Refrigerator|Front Load Washer|Smart Air Purifier|Microwave Oven|Robot Vacuum Cleaner|Smart Ceiling Fan'),
  (New-IndustrySpec 32 'Textile Machinery & Mill Supplies' 'Spinning Machinery|Weaving Machinery|Mill Spares|Textile Testing' 'High Speed Spindle|Rapier Loom Part|Carding Wire Roll|Yarn Tension Meter|Mill Bearing Kit|Automatic Cone Winder'),
  (New-IndustrySpec 33 'Food Processing & Packaging Machinery' 'Processing Equipment|Filling Machines|Sealing Systems|Food Safety Tools' 'Industrial Mixer Machine|Automatic Liquid Filler|Continuous Band Sealer|Food Grade Conveyor|Vacuum Packing Machine|Metal Detector Unit'),
  (New-IndustrySpec 34 'Plastic Moulding & Dies' 'Injection Moulds|Extrusion Dies|Mould Components|Processing Accessories' 'Precision Injection Mould|Profile Extrusion Die|Ejector Pin Set|Hot Runner Controller|Mould Release Spray|Die Polishing Tool Kit'),
  (New-IndustrySpec 35 'Renewable Energy & Solar' 'Solar Modules|Inverters|Mounting Systems|Energy Monitoring' 'Mono PERC Solar Panel|Hybrid Solar Inverter|Rooftop Mounting Kit|Solar DC Cable|Energy Monitoring Meter|Solar Junction Box'),
  (New-IndustrySpec 36 'Batteries & Power Systems' 'Industrial Batteries|UPS Systems|Energy Storage|Battery Accessories' 'Tubular Battery|Online UPS Unit|Lithium Storage Pack|Battery Charger|Power Distribution Unit|Battery Connector Set'),
  (New-IndustrySpec 37 'Oil, Lubricants & Industrial Fluids' 'Engine Oils|Hydraulic Oils|Greases|Metalworking Fluids' 'Heavy Duty Engine Oil|Premium Hydraulic Fluid|High Temperature Grease|Cutting Oil Drum|Gear Oil Can|Rust Preventive Fluid'),
  (New-IndustrySpec 38 'Marine & Port Supplies' 'Deck Supplies|Engine Stores|Safety Equipment|Mooring Equipment' 'Marine Rope Coil|Engine Gasket Kit|Life Jacket Pack|Heavy Duty Shackle|Deck Cleaning Chemical|Navigation Lamp Set'),
  (New-IndustrySpec 39 'Aviation & MRO Consumables' 'Aircraft Consumables|Ground Support|Cabin Supplies|Maintenance Tools' 'Aviation Sealant Kit|Ground Power Cable|Cabin Service Cart|Precision Torque Wrench|Safety Wire Spool|Aircraft Cleaning Fluid'),
  (New-IndustrySpec 40 'Railway & Industrial OEM Supplies' 'Rail Components|Signalling Supplies|Electrical Systems|Maintenance Consumables' 'Rail Fastening System|Signal Relay Unit|Traction Cable|Bearing Assembly|Industrial Brake Block|Maintenance Grease Pack'),
  (New-IndustrySpec 41 'Defence & Aerospace Industrial Supply' 'Precision Components|Rugged Electronics|Protective Materials|MRO Supplies' 'Aerospace Fastener Kit|Rugged Control Module|Ballistic Composite Sheet|Precision Connector|Technical Lubricant|Inspection Tool Set'),
  (New-IndustrySpec 42 'Laboratory & Scientific Equipment' 'Lab Instruments|Glassware|Reagents|Safety Supplies' 'Digital Lab Balance|Borosilicate Flask Set|Analytical Reagent Pack|Laboratory Microscope|Chemical Safety Cabinet|Portable pH Meter'),
  (New-IndustrySpec 43 'Pet Care & Veterinary Distribution' 'Pet Food|Grooming|Veterinary Care|Pet Accessories' 'Premium Dog Food Bag|Pet Grooming Kit|Veterinary Supplement|Comfort Pet Bed|Cat Activity Toy|Flea Control Shampoo'),
  (New-IndustrySpec 44 'Toys & General Merchandise' 'Educational Toys|Outdoor Play|Games & Puzzles|Gift Merchandise' 'STEM Learning Kit|Kids Ride-On Toy|Family Board Game|Building Block Set|Soft Plush Toy|Creative Art Box'),
  (New-IndustrySpec 45 'Sports & Fitness Equipment' 'Fitness Equipment|Team Sports|Outdoor Sports|Sportswear' 'Adjustable Dumbbell Set|Professional Cricket Bat|Camping Tent|Performance Training Shoes|Yoga Mat Bundle|Football Training Kit'),
  (New-IndustrySpec 46 'Hospitality & Restaurant Supplies' 'Commercial Kitchen|Tableware|Housekeeping|Guest Supplies' 'Commercial Cooking Range|Porcelain Dinner Set|Housekeeping Trolley|Hotel Toiletry Kit|Food Storage Container|Restaurant Cutlery Set'),
  (New-IndustrySpec 47 'Metals, Steel & Non-ferrous Trade' 'Steel Products|Aluminium|Copper & Brass|Specialty Alloys' 'Stainless Steel Sheet|Aluminium Extrusion Bar|Copper Coil Roll|Brass Rod Bundle|Mild Steel Plate|Nickel Alloy Round Bar')
)

# Positional entries follow the industry/product lists above. Prices are fictional
# INR preview values, not quotations. Category numbers are one-based.
$demoPrices = @(
 '18999,42999,1499,27999,2499,999', '1799,2499,1899,649,899,1299',
 '4200,2400,1800,650,5800,1200', '18500,42000,28000,1599,6500,8900',
 '450000,28500,12500,34000,8900,4800', '48000,62000,4200,8500,125000,32000',
 '349,1499,599,899,1299,1799', '1800,450,1200,2200,3400,4800',
 '1250,960,420,720,650,1800', '120,480,299,650,180,1250',
 '28500,1499,650,12500,899,1800', '499,349,299,1799,249,1499',
 '850,1250,650,4500,2800,1499', '380,4800,3200,1850,450,850',
 '2450,1850,1650,450,280,3200', '2400,1850,6500,950,1800,4800',
 '2450,3200,4500,1650,2100,5800', '950,1800,450,2400,650,850',
 '1850,1450,350,450,850,650', '28500,32000,8500,4200,18500,12500',
 '1850,2400,950,650,1800,3200', '4200,1850,950,2800,450,899',
 '1850,2400,650,450,899,1800', '42000,85000,8500,6500,1499,18500',
 '8500,1850,150,12500,6500,3200', '1850,4200,950,1450,2800,450',
 '1800,450,2400,350,1850,650', '18500,16500,850,4200,2800,650',
 '850,650,1450,2400,450,350', '125000,18500,32000,8500,6500,950',
 '28500,32000,8500,12500,18500,4200', '4500,12500,3200,8500,1850,85000',
 '85000,125000,18500,65000,28500,95000', '85000,42000,1850,12500,450,3200',
 '8500,42000,6500,2400,3500,1850', '12500,28500,65000,4200,8500,650',
 '4500,12500,1850,8500,2400,3200', '6500,4200,1850,950,2400,3200',
 '8500,12500,42000,6500,1850,3200', '4200,8500,12500,6500,2400,1850',
 '6500,28500,12500,4200,3200,8500', '8500,1850,2400,12500,28500,1499',
 '2400,850,650,1850,350,450', '1499,4200,650,950,450,850',
 '4200,2850,6500,1850,950,1499', '42000,6500,8500,950,1450,1850',
 '6500,4200,12500,8500,4500,18500'
)
$demoCategoryMap = @(
 '1,2,3,3,4,4','1,2,3,4,2,3','1,2,3,4,1,1','1,2,3,4,2,1',
 '1,2,3,3,3,4','2,1,3,4,1,2','3,2,3,3,3,4','2,3,1,3,1,4',
 '1,2,2,3,4,1','2,3,4,4,4,3','1,2,3,4,2,1','1,2,3,4,1,4',
 '1,2,3,4,4,4','1,2,3,4,1,1','1,2,3,4,4,2','2,3,3,4,1,3',
 '1,2,3,4,1,3','1,2,3,4,2,2','1,2,3,4,2,2','1,2,3,4,1,3',
 '1,2,3,4,3,3','1,2,3,4,3,1','1,2,3,4,4,3','1,2,3,4,4,2',
 '1,2,3,4,1,2','1,2,3,4,2,1','1,2,3,4,4,1','1,2,3,4,2,4',
 '1,2,3,4,1,1','1,2,3,1,2,4','1,2,3,1,2,4','1,2,3,4,3,1',
 '1,2,3,1,3,4','1,2,3,4,4,4','1,2,3,3,4,3','1,2,3,4,2,4',
 '1,2,3,4,1,4','4,2,3,4,1,1','1,2,3,4,1,1','1,2,3,4,1,4',
 '1,2,3,1,4,4','1,2,3,1,4,1','1,2,3,4,4,2','1,2,3,1,4,1',
 '1,2,3,4,1,2','1,2,3,4,1,2','1,2,3,3,1,4'
)
if ($demoPrices.Count -ne $industries.Count -or $demoCategoryMap.Count -ne $industries.Count) {
  throw 'Every industry must have curated demo prices and category mappings.'
}

$palettes = @(
  @{ Primary = '#2563EB'; Secondary = '#06B6D4'; Surface = '#EFF6FF'; Ink = '#0F172A'; Muted = '#475569' },
  @{ Primary = '#B45309'; Secondary = '#F59E0B'; Surface = '#FFFBEB'; Ink = '#292524'; Muted = '#78716C' },
  @{ Primary = '#7C3AED'; Secondary = '#EC4899'; Surface = '#FAF5FF'; Ink = '#2E1065'; Muted = '#6B7280' },
  @{ Primary = '#334155'; Secondary = '#F97316'; Surface = '#F8FAFC'; Ink = '#0F172A'; Muted = '#64748B' },
  @{ Primary = '#0F766E'; Secondary = '#14B8A6'; Surface = '#F0FDFA'; Ink = '#134E4A'; Muted = '#64748B' },
  @{ Primary = '#9F1239'; Secondary = '#D4AF37'; Surface = '#FFF1F2'; Ink = '#4C0519'; Muted = '#78716C' },
  @{ Primary = '#4338CA'; Secondary = '#A855F7'; Surface = '#EEF2FF'; Ink = '#1E1B4B'; Muted = '#64748B' },
  @{ Primary = '#166534'; Secondary = '#84CC16'; Surface = '#F7FEE7'; Ink = '#14532D'; Muted = '#4B5563' },
  @{ Primary = '#C2410C'; Secondary = '#FB923C'; Surface = '#FFF7ED'; Ink = '#431407'; Muted = '#78716C' },
  @{ Primary = '#0369A1'; Secondary = '#38BDF8'; Surface = '#F0F9FF'; Ink = '#082F49'; Muted = '#64748B' },
  @{ Primary = '#BE123C'; Secondary = '#F472B6'; Surface = '#FFF1F2'; Ink = '#500724'; Muted = '#6B7280' },
  @{ Primary = '#4D7C0F'; Secondary = '#EAB308'; Surface = '#FEFCE8'; Ink = '#365314'; Muted = '#6B7280' }
)

function New-DemoAsset(
  [string]$Path,
  [string]$Title,
  [string]$Subtitle,
  [hashtable]$Palette,
  [int]$Seed,
  [ValidateSet('hero','category','product','detail','logo')][string]$Kind
) {
  $width = if ($Kind -eq 'hero') { 1400 } elseif ($Kind -eq 'logo') { 320 } else { 720 }
  $height = if ($Kind -eq 'hero') { 720 } elseif ($Kind -eq 'logo') { 320 } else { 620 }
  $titleSafe = XmlEscape $Title
  $subtitleSafe = XmlEscape $Subtitle
  $shapeX = 60 + (($Seed * 47) % [Math]::Max(100, ($width - 360)))
  $shapeY = 80 + (($Seed * 31) % [Math]::Max(100, ($height - 300)))
  $fontSize = if ($Kind -eq 'hero') {
    if ($Title.Length -gt 44) { 34 } elseif ($Title.Length -gt 34) { 44 } else { 58 }
  } elseif ($Kind -eq 'logo') {
    if ($Title.Length -gt 34) { 23 } elseif ($Title.Length -gt 25) { 29 } else { 38 }
  } else {
    if ($Title.Length -gt 34) { 27 } elseif ($Title.Length -gt 25) { 32 } else { 38 }
  }
  $subtitleSize = if ($Kind -eq 'hero') {
    if ($Subtitle.Length -gt 105) { 19 } elseif ($Subtitle.Length -gt 85) { 22 } else { 25 }
  } else {
    if ($Subtitle.Length -gt 48) { 16 } elseif ($Subtitle.Length -gt 36) { 18 } else { 21 }
  }
  $markup = @"
<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="0 0 $width $height" role="img" aria-label="$titleSafe">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="$($Palette.Surface)"/>
      <stop offset="1" stop-color="$($Palette.Secondary)" stop-opacity="0.42"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="$($Palette.Primary)"/>
      <stop offset="1" stop-color="$($Palette.Secondary)"/>
    </linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.18"/></filter>
  </defs>
  <rect width="$width" height="$height" rx="36" fill="url(#bg)"/>
  <circle cx="$($width - 90)" cy="90" r="190" fill="$($Palette.Secondary)" opacity="0.25"/>
  <circle cx="100" cy="$($height - 40)" r="170" fill="$($Palette.Primary)" opacity="0.12"/>
  <g filter="url(#shadow)">
    <rect x="$shapeX" y="$shapeY" width="290" height="235" rx="32" fill="white" opacity="0.96"/>
    <rect x="$($shapeX + 34)" y="$($shapeY + 34)" width="222" height="118" rx="24" fill="url(#accent)"/>
    <circle cx="$($shapeX + 84)" cy="$($shapeY + 190)" r="24" fill="$($Palette.Secondary)"/>
    <rect x="$($shapeX + 124)" y="$($shapeY + 174)" width="124" height="30" rx="15" fill="$($Palette.Primary)" opacity="0.72"/>
  </g>
  <rect x="48" y="$($height - 178)" width="$($width - 96)" height="130" rx="28" fill="white" opacity="0.92"/>
  <text x="82" y="$($height - 112)" font-family="Arial, sans-serif" font-size="$fontSize" font-weight="800" fill="$($Palette.Ink)">$titleSafe</text>
  <text x="84" y="$($height - 70)" font-family="Arial, sans-serif" font-size="$subtitleSize" fill="$($Palette.Muted)">$subtitleSafe</text>
</svg>
"@
  Write-Utf8NoBom -Path $Path -Content $markup
}

function New-ThemePackage($Spec, [ValidateSet('web','app')][string]$Platform) {
  $industrySlug = Slugify $Spec.Name
  $platformLabel = if ($Platform -eq 'web') { 'Web' } else { 'App' }
  $slug = "$industrySlug-$Platform-theme"
  $themeName = "$($Spec.Name) $platformLabel Theme"
  $themeDir = Join-Path $buildRoot $slug
  $imagesDir = Join-Path $themeDir 'assets/images'
  $cssDir = Join-Path $themeDir 'assets/css'
  $templatesDir = Join-Path $themeDir 'templates'
  $tokensDir = Join-Path $themeDir 'tokens'
  $demoDir = Join-Path $themeDir 'demo-data'
  $localesDir = Join-Path $themeDir 'locales'
  New-Item -ItemType Directory -Force -Path $imagesDir, $cssDir, $templatesDir, $tokensDir, $demoDir, $localesDir | Out-Null

  $palette = $palettes[($Spec.Order - 1) % $palettes.Count]
  $seed = ($Spec.Order * 10) + $(if ($Platform -eq 'app') { 5 } else { 0 })
  $brandName = if ($Platform -eq 'web') { "$($Spec.Name) TradeHub" } else { "$($Spec.Name) Go" }
  $heroTitle = if ($Platform -eq 'web') {
    "Wholesale $($Spec.Name), built for modern business"
  } else {
    "$($Spec.Name) ordering in your pocket"
  }
  $tagline = "Industry-ready discovery, trade pricing, repeat ordering, and catalog experiences for $($Spec.Name.ToLowerInvariant())."

  New-DemoAsset -Path (Join-Path $imagesDir 'hero.svg') -Title $brandName -Subtitle $tagline -Palette $palette -Seed $seed -Kind hero
  New-DemoAsset -Path (Join-Path $imagesDir 'detail.svg') -Title "$($Spec.Name) Advantage" -Subtitle 'Reliable supply, clear pricing, fast ordering' -Palette $palette -Seed ($seed + 1) -Kind detail
  New-DemoAsset -Path (Join-Path $imagesDir 'logo.svg') -Title $brandName -Subtitle $platformLabel -Palette $palette -Seed ($seed + 2) -Kind logo

  $categoryRows = @()
  for ($i = 0; $i -lt $Spec.Categories.Count; $i++) {
    $n = $i + 1
    $file = "category-{0:d2}.svg" -f $n
    New-DemoAsset -Path (Join-Path $imagesDir $file) -Title $Spec.Categories[$i] -Subtitle "$($Spec.Name) category" -Palette $palette -Seed ($seed + 10 + $i) -Kind category
    $categoryRows += [ordered]@{
      id = "$industrySlug-category-$n"
      slug = (Slugify $Spec.Categories[$i])
      name = $Spec.Categories[$i]
      description = "Browse wholesale $($Spec.Categories[$i].ToLowerInvariant()) for verified business buyers."
      image = "assets/images/$file"
    }
  }

  $productRows = @()
  for ($i = 0; $i -lt $Spec.Products.Count; $i++) {
    $n = $i + 1
    $file = "product-{0:d2}.svg" -f $n
    $price = [int]($demoPrices[$Spec.Order - 1].Split(',')[$i])
    $categoryIndex = [int]($demoCategoryMap[$Spec.Order - 1].Split(',')[$i]) - 1
    $category = $categoryRows[$categoryIndex]
    $moq = if ($price -ge 10000) { 1 } else { @(5, 10, 6, 12, 4, 8)[$i] }
    New-DemoAsset -Path (Join-Path $imagesDir $file) -Title $Spec.Products[$i] -Subtitle "Demo SKU $($Spec.Order)-$('{0:d2}' -f $n)" -Palette $palette -Seed ($seed + 20 + $i) -Kind product
    $productRows += [ordered]@{
      id = "$industrySlug-product-$n"
      slug = (Slugify $Spec.Products[$i])
      sku = ("DEMO-{0:d2}-{1:d3}" -f $Spec.Order, $n)
      name = $Spec.Products[$i]
      description = "$($Spec.Products[$i]) from our $($category.name.ToLowerInvariant()) collection. Compare sample trade pricing, available quantities and bulk savings for your next $($Spec.Name.ToLowerInvariant()) order. Fictional preview item; specifications and prices require supplier confirmation."
      demoOnly = $true
      category = $category.slug
      categoryId = $category.id
      categoryName = $category.name
      brand = "$($Spec.Name) Select"
      price = $price
      currency = 'INR'
      priceLabel = "INR $($price.ToString('N0', [System.Globalization.CultureInfo]::InvariantCulture))"
      image = "assets/images/$file"
      stock = 25 + ($i * 17)
      moq = $moq
      unit = 'selling pack'
      availability = 'In stock (demo)'
      badge = @('Best seller', 'New arrival', 'Bulk deal', 'Popular pick', 'Featured', 'Value pack')[$i]
      compareAtPrice = [int][Math]::Ceiling($price * 1.15)
      leadTime = 'Sample dispatch: 3-5 business days'
      bulkPrices = @(
        [ordered]@{ minQuantity = $moq; unitPrice = $price },
        [ordered]@{ minQuantity = $moq * 5; unitPrice = [int][Math]::Round($price * 0.95) },
        [ordered]@{ minQuantity = $moq * 10; unitPrice = [int][Math]::Round($price * 0.90) }
      )
    }
  }

  $categoryImages = @($categoryRows | ForEach-Object { $_.image })
  $categoryLabels = @($categoryRows | ForEach-Object { $_.name })
  $productImages = @($productRows | ForEach-Object { $_.image })
  $productLabels = @($productRows | ForEach-Object { $_.name })
  $productPrices = @($productRows | ForEach-Object { $_.priceLabel })

  $allowed = @(
    'header', 'hero-banner', 'promo-banner', 'category-grid', 'product-grid',
    'image-with-text', 'feature-list', 'testimonial-carousel', 'newsletter',
    'footer', 'filter-sidebar', 'cta-banner', 'product-gallery', 'product-info',
    'related-products', 'faq-section'
  )
  $mobileLayout = @('grid', 'list', 'fast_order')[($Spec.Order - 1) % 3]
  $manifest = [ordered]@{
    name = $themeName
    version = '1.1.0'
    storefrontKey = $slug
    industry = $Spec.Name
    industryId = $Spec.IndustryId
    description = "$platformLabel commerce theme for $($Spec.Name), packaged with industry-specific demo content for Live Preview."
    author = 'B2B Platform Theme Studio'
    templates = [ordered]@{
      home = 'templates/home.json'
      category = 'templates/category.json'
      product = 'templates/product.json'
    }
    allowedSections = $allowed
    capabilities = [ordered]@{ allowedSections = $allowed }
    tokens = [ordered]@{
      colors = 'tokens/colors.json'
      typography = 'tokens/typography.json'
      spacing = 'tokens/spacing.json'
      layout = 'tokens/layout.json'
    }
    assets = [ordered]@{ css = 'assets/css/theme.css'; logo = 'assets/images/logo.svg' }
    preview = [ordered]@{
      desktop = 'assets/images/hero.svg'
      tablet = 'assets/images/hero.svg'
      mobile = 'assets/images/hero.svg'
    }
    demoData = 'demo-data/catalog.json'
    languages = @('en')
    defaultLanguage = 'en'
    locales = [ordered]@{ en = 'locales/en.json' }
  }
  if ($Platform -eq 'app') {
    $manifest.mobile = [ordered]@{
      base_layout = $mobileLayout
      card_style = $(if (($Spec.Order % 4) -eq 0) { 'square' } else { 'rounded' })
      spacing = $(if (($Spec.Order % 2) -eq 0) { 'compact' } else { 'comfortable' })
      show_banner = $true
      enable_quick_qty = (($Spec.Order % 3) -eq 0)
      banner_image = 'assets/images/hero.svg'
      category_image = 'assets/images/category-01.svg'
    }
  }
  Write-JsonFile -Value $manifest -Path (Join-Path $themeDir 'theme.json')

  $homeSections = @(
    [ordered]@{ id = 'header'; type = 'header'; settings = [ordered]@{ logoText = $brandName; industryName = $Spec.Name; nav = @('Home', 'Categories', 'Products', 'Offers', 'Cart', 'Login') } },
    [ordered]@{ id = 'hero'; type = 'hero-banner'; settings = [ordered]@{ eyebrow = "B2B $platformLabel Commerce"; title = $heroTitle; subtitle = $tagline; primaryCta = 'Explore catalog'; secondaryCta = 'Request bulk quote'; image = 'assets/images/hero.svg' } },
    [ordered]@{ id = 'promo'; type = 'promo-banner'; settings = [ordered]@{ title = "Save up to 10% on bulk $($Spec.Name) orders"; subtitle = "Sample offer: explore $($categoryLabels[0]) and $($categoryLabels[1]). Demo pricing only; supplier confirmation required." } },
    [ordered]@{ id = 'categories'; type = 'category-grid'; settings = [ordered]@{ title = "Shop $($Spec.Name) categories"; subtitle = 'Industry-specific demo categories included in this package.'; images = $categoryImages; labels = $categoryLabels; categories = $categoryRows } },
    [ordered]@{ id = 'products'; type = 'product-grid'; settings = [ordered]@{ eyebrow = 'DEMO CATALOG'; title = "$($Spec.Name) best sellers"; subtitle = 'Preview-ready sample products; live tenant products automatically take priority.'; images = $productImages; labels = $productLabels; prices = $productPrices; products = $productRows; limit = 6; primaryCta = 'View all' } },
    [ordered]@{ id = 'story'; type = 'image-with-text'; settings = [ordered]@{ title = "Built for $($Spec.Name) distribution"; body = 'Present specifications, inventory, prices, and buyer actions through a focused industry storefront.'; image = 'assets/images/detail.svg'; imagePosition = $(if (($Spec.Order % 2) -eq 0) { 'left' } else { 'right' }) } },
    [ordered]@{ id = 'benefits'; type = 'feature-list'; settings = [ordered]@{ title = 'Designed for B2B buyers'; items = @(
      [ordered]@{ icon = '01'; title = 'Trade-ready catalog'; text = 'Clear product discovery with industry-specific content.' },
      [ordered]@{ icon = '02'; title = 'Bulk order friendly'; text = 'MOQ, stock, and price cues support repeat purchasing.' },
      [ordered]@{ icon = '03'; title = 'Responsive preview'; text = 'Layouts work across desktop, tablet, and mobile views.' }
    ) } },
    [ordered]@{ id = 'testimonial'; type = 'testimonial-carousel'; settings = [ordered]@{ title = 'Buyer feedback'; quote = "The $($Spec.Name) catalog is easy to scan and reorder from."; author = 'Demo Retail Partner' } },
    [ordered]@{ id = 'newsletter'; type = 'newsletter'; settings = [ordered]@{ title = 'Get catalog updates'; subtitle = 'Receive new product, restock, and trade offer alerts.' } },
    [ordered]@{ id = 'footer'; type = 'footer'; settings = [ordered]@{ logoText = $brandName; industryName = $Spec.Name; tagline = $tagline; columns = @(
      [ordered]@{ heading = 'Catalog'; links = @('Categories', 'Products', 'Offers') },
      [ordered]@{ heading = 'Buyer Help'; links = @('Bulk Orders', 'Shipping', 'Returns') },
      [ordered]@{ heading = 'Account'; links = @('Login', 'Orders', 'Cart') }
    ) } }
  )
  Write-JsonFile -Value ([ordered]@{ sections = $homeSections }) -Path (Join-Path $templatesDir 'home.json')

  $categorySections = @(
    $homeSections[0],
    [ordered]@{ id = 'category-hero'; type = 'hero-banner'; settings = [ordered]@{ title = "$($Spec.Name) catalog"; subtitle = 'Browse category-specific wholesale products and demo pricing.'; image = 'assets/images/category-01.svg'; primaryCta = 'Start browsing' } },
    [ordered]@{ id = 'filters'; type = 'filter-sidebar'; settings = [ordered]@{ title = 'Filter catalog'; message = 'Filter by category, brand, availability, price, and specification.' } },
    [ordered]@{ id = 'category-products'; type = 'product-grid'; settings = [ordered]@{ title = 'Demo catalog products'; subtitle = 'Sample products bundled for preview.'; images = $productImages; labels = $productLabels; prices = $productPrices; products = $productRows; limit = 6 } },
    [ordered]@{ id = 'quote'; type = 'cta-banner'; settings = [ordered]@{ title = 'Need a bulk quote?'; subtitle = 'Sign in to request distributor pricing and availability.'; buttonLabel = 'Request quote' } },
    $homeSections[$homeSections.Count - 1]
  )
  Write-JsonFile -Value ([ordered]@{ sections = $categorySections }) -Path (Join-Path $templatesDir 'category.json')

  $productSections = @(
    $homeSections[0],
    [ordered]@{ id = 'gallery'; type = 'product-gallery'; settings = [ordered]@{ title = $productRows[0].name; images = $productImages } },
    [ordered]@{ id = 'info'; type = 'product-info'; settings = [ordered]@{ title = $productRows[0].name; subtitle = $productRows[0].description; price = $productRows[0].priceLabel; description = $productRows[0].description; sku = $productRows[0].sku; stock = $productRows[0].stock; moq = $productRows[0].moq; product = $productRows[0] } },
    [ordered]@{ id = 'related'; type = 'related-products'; settings = [ordered]@{ title = 'Related demo products'; images = $productImages; labels = $productLabels; prices = $productPrices; products = $productRows; limit = 6 } },
    [ordered]@{ id = 'faq'; type = 'faq-section'; settings = [ordered]@{ title = 'Ordering information'; items = @(
      [ordered]@{ question = 'Is bulk pricing supported?'; answer = 'Yes. Live tenant pricing and MOQ rules replace demo values.' },
      [ordered]@{ question = 'Are these preview products real?'; answer = 'No. They are clearly marked demo records bundled only for visual preview.' }
    ) } },
    $homeSections[$homeSections.Count - 1]
  )
  Write-JsonFile -Value ([ordered]@{ sections = $productSections }) -Path (Join-Path $templatesDir 'product.json')

  Write-JsonFile -Value ([ordered]@{
    industryId = $Spec.IndustryId
    industry = $Spec.Name
    themeName = $themeName
    demoOnly = $true
    currency = 'INR'
    disclaimer = 'Fictional preview catalog. Prices, stock, offers and feedback are sample data, not real quotations or endorsements.'
    store = [ordered]@{ name = $brandName; industry = $Spec.Name; tagline = $tagline; email = 'sales@example.com'; supportHours = 'Monday-Saturday, 9 AM-6 PM'; logo = 'assets/images/logo.svg' }
    offers = @([ordered]@{ title = "Bulk savings on $($Spec.Name)"; description = 'Sample 5% savings at 5x MOQ and 10% at 10x MOQ.'; demoOnly = $true })
    testimonials = @([ordered]@{ author = 'Demo Retail Partner'; quote = "The $($Spec.Name) catalog is easy to scan and reorder from."; demoOnly = $true })
    categories = $categoryRows
    products = $productRows
  }) -Path (Join-Path $demoDir 'catalog.json')

  $englishLocale = [ordered]@{}
  foreach ($text in @($themeName, $brandName, $Spec.Name, $heroTitle, $tagline) + $Spec.Categories + $Spec.Products) {
    $englishLocale[$text] = $text
  }
  Write-JsonFile -Value $englishLocale -Path (Join-Path $localesDir 'en.json')

  Write-JsonFile -Value ([ordered]@{
    primary = $palette.Primary; secondary = $palette.Secondary; surface = $palette.Surface; ink = $palette.Ink; muted = $palette.Muted
    light = [ordered]@{ primary = $palette.Primary; secondary = $palette.Secondary; background = $palette.Surface; surface = '#FFFFFF'; on_surface = $palette.Ink; on_background = $palette.Ink }
  }) -Path (Join-Path $tokensDir 'colors.json')
  $themeFont = if ($Platform -eq 'app') { 'Poppins, Arial, sans-serif' } else { 'Roboto, Arial, sans-serif' }
  Write-JsonFile -Value ([ordered]@{ family = [ordered]@{ heading = $themeFont; body = $themeFont }; scale = 'responsive' }) -Path (Join-Path $tokensDir 'typography.json')
  Write-JsonFile -Value ([ordered]@{ section = $(if ($Platform -eq 'app') { '18px' } else { '64px' }); gap = $(if ($Platform -eq 'app') { '12px' } else { '24px' }) }) -Path (Join-Path $tokensDir 'spacing.json')
  Write-JsonFile -Value ([ordered]@{ base_layout = $(if ($Platform -eq 'app') { $mobileLayout } else { 'responsive-grid' }); radius = $(if (($Spec.Order % 4) -eq 0) { '6px' } else { '18px' }); maxWidth = $(if ($Platform -eq 'app') { '480px' } else { '1440px' }) }) -Path (Join-Path $tokensDir 'layout.json')

  $css = @"
:root {
  --theme-primary: $($palette.Primary);
  --theme-secondary: $($palette.Secondary);
  --theme-surface: $($palette.Surface);
  --theme-text: $($palette.Ink);
  --theme-muted: $($palette.Muted);
  --theme-border: color-mix(in srgb, $($palette.Primary) 16%, white);
  --theme-primary-contrast: #ffffff;
  --theme-radius: $(if (($Spec.Order % 4) -eq 0) { '6px' } else { '18px' });
}
.theme-section-root img { background: $($palette.Surface); }
.theme-section-root a, .theme-section-root button { transition: transform .2s ease, filter .2s ease; }
.theme-section-root a:hover, .theme-section-root button:hover { filter: brightness(.98); }
"@
  Write-Utf8NoBom -Path (Join-Path $cssDir 'theme.css') -Content $css

  Write-Utf8NoBom -Path (Join-Path $themeDir 'README.txt') -Content @"
$themeName

Upload channel: $($platformLabel.ToUpperInvariant())
Industry: $($Spec.Name)
Industry ID: $($Spec.IndustryId)

This package includes theme.json, three page templates, tokens, CSS, SVG preview assets,
four demo categories, six demo products, and demo-data/catalog.json.
Version 1.1 adds curated sample INR prices, category mappings, descriptions,
stock, MOQ, bulk-price tiers, badges, offers, store details and sample feedback.
Demo records are for Live Preview only. Real tenant catalog data takes priority at runtime.
"@

  $zipDir = Join-Path $outputFull $Platform
  $zipPath = Join-Path $zipDir "$slug.zip"
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  Compress-Archive -Path (Join-Path $themeDir '*') -DestinationPath $zipPath -CompressionLevel Optimal

  return [ordered]@{
    industryOrder = $Spec.Order
    industryId = $Spec.IndustryId
    industry = $Spec.Name
    platform = $(if ($Platform -eq 'web') { 'WEB' } else { 'MOBILE' })
    themeName = $themeName
    slug = $slug
    zip = "$Platform/$slug.zip"
    categories = $categoryRows.Count
    products = $productRows.Count
  }
}

function Read-ZipJson([System.IO.Compression.ZipArchive]$Archive, [string]$EntryName) {
  $entry = $Archive.Entries | Where-Object { $_.FullName.Replace('\', '/') -eq $EntryName } | Select-Object -First 1
  if ($null -eq $entry) { throw "Missing ZIP entry: $EntryName" }
  $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8, $true)
  try { return ($reader.ReadToEnd() | ConvertFrom-Json) } finally { $reader.Dispose() }
}

function Test-ThemeZip($CatalogRow) {
  $zipPath = Join-Path $outputFull $CatalogRow.zip
  $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($required in @('theme.json', 'templates/home.json', 'templates/category.json', 'templates/product.json', 'demo-data/catalog.json', 'assets/css/theme.css', 'locales/en.json')) {
      if ($names -notcontains $required) { throw "$($CatalogRow.zip): missing $required" }
    }
    $manifest = Read-ZipJson -Archive $archive -EntryName 'theme.json'
    $homeTemplate = Read-ZipJson -Archive $archive -EntryName 'templates/home.json'
    $demo = Read-ZipJson -Archive $archive -EntryName 'demo-data/catalog.json'
    if ($manifest.name -ne $CatalogRow.themeName) { throw "$($CatalogRow.zip): theme name mismatch" }
    if ($manifest.industryId -ne $CatalogRow.industryId) { throw "$($CatalogRow.zip): industry id mismatch" }
    if (@($homeTemplate.sections).Count -lt 8) { throw "$($CatalogRow.zip): incomplete home preview sections" }
    if (@($demo.categories).Count -ne 4) { throw "$($CatalogRow.zip): expected 4 demo categories" }
    if (@($demo.products).Count -ne 6) { throw "$($CatalogRow.zip): expected 6 demo products" }
    $categorySlugs = @($demo.categories | ForEach-Object { $_.slug })
    foreach ($product in $demo.products) {
      if ($product.category -notin $categorySlugs) { throw "$($CatalogRow.zip): invalid category mapping" }
      if ($product.price -le 0 -or $product.moq -lt 1 -or $product.stock -lt $product.moq) { throw "$($CatalogRow.zip): invalid price or stock/MOQ" }
      if (-not $product.demoOnly -or -not $product.description -or @($product.bulkPrices).Count -ne 3) { throw "$($CatalogRow.zip): incomplete demo product" }
      if ($product.image -notin $names) { throw "$($CatalogRow.zip): missing product image" }
    }
    foreach ($sectionType in @('product-grid', 'category-grid')) {
      $section = @($homeTemplate.sections | Where-Object { $_.type -eq $sectionType })[0]
      if ($sectionType -eq 'product-grid') {
        if (@($section.settings.products).Count -ne 6 -or @($section.settings.labels).Count -ne 6 -or @($section.settings.prices).Count -ne 6) { throw "$($CatalogRow.zip): web/app product preview data missing" }
      } elseif (@($section.settings.categories).Count -ne 4 -or @($section.settings.labels).Count -ne 4) { throw "$($CatalogRow.zip): web/app category preview data missing" }
    }
    $imageEntries = @($names | Where-Object { $_ -like 'assets/images/*.svg' })
    if ($imageEntries.Count -lt 12) { throw "$($CatalogRow.zip): expected at least 12 preview SVG assets" }
    if ($names | Where-Object { $_ -match '\.(tsx?|jsx?|mts|cts)$' }) { throw "$($CatalogRow.zip): forbidden source file in archive" }
    return [ordered]@{ zip = $CatalogRow.zip; valid = $true; entries = $names.Count; sections = @($homeTemplate.sections).Count; images = $imageEntries.Count }
  } finally {
    $archive.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path $outputFull | Out-Null
$webOut = Join-Path $outputFull 'web'
$appOut = Join-Path $outputFull 'app'
$buildRoot = Join-Path $outputFull '_build'
foreach ($target in @($webOut, $appOut, $buildRoot)) {
  Assert-ChildPath -Parent $outputFull -Candidate $target
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $target | Out-Null
}

$catalog = @()
foreach ($industry in $industries) {
  $catalog += New-ThemePackage -Spec $industry -Platform web
  $catalog += New-ThemePackage -Spec $industry -Platform app
}

Write-JsonFile -Value ([ordered]@{
  generatedAt = [DateTimeOffset]::Now.ToString('o')
  industryCount = $industries.Count
  webThemeCount = @($catalog | Where-Object { $_.platform -eq 'WEB' }).Count
  appThemeCount = @($catalog | Where-Object { $_.platform -eq 'MOBILE' }).Count
  totalThemeCount = $catalog.Count
  themes = $catalog
}) -Path (Join-Path $outputFull 'catalog.json')

$validation = @($catalog | ForEach-Object { Test-ThemeZip $_ })
Write-JsonFile -Value ([ordered]@{
  valid = (@($validation | Where-Object { -not $_.valid }).Count -eq 0)
  checked = $validation.Count
  web = @($catalog | Where-Object { $_.platform -eq 'WEB' }).Count
  app = @($catalog | Where-Object { $_.platform -eq 'MOBILE' }).Count
  results = $validation
}) -Path (Join-Path $outputFull 'validation-report.json')

$bundlePath = Join-Path $outputFull 'all-47-industry-web-app-themes.zip'
if (Test-Path -LiteralPath $bundlePath) { Remove-Item -LiteralPath $bundlePath -Force }
Compress-Archive -Path @(
  $webOut,
  $appOut,
  (Join-Path $outputFull 'catalog.json'),
  (Join-Path $outputFull 'validation-report.json')
) -DestinationPath $bundlePath -CompressionLevel Optimal

Assert-ChildPath -Parent $outputFull -Candidate $buildRoot
Remove-Item -LiteralPath $buildRoot -Recurse -Force

Write-Host "Generated and validated $($catalog.Count) theme ZIPs for $($industries.Count) industries."
Write-Host "Web themes: $(@($catalog | Where-Object { $_.platform -eq 'WEB' }).Count)"
Write-Host "App themes: $(@($catalog | Where-Object { $_.platform -eq 'MOBILE' }).Count)"
Write-Host "Output: $outputFull"
