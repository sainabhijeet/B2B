$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$seedDir = Join-Path $root 'exports\mobile-themes\grocery_theme_pack\database'
$storageDir = Join-Path $root 'saas-platform\backend\storage\grocery-catalog'
$productDir = Join-Path $storageDir 'products'
$categoryDir = Join-Path $storageDir 'categories'
New-Item -ItemType Directory -Force -Path $productDir | Out-Null
New-Item -ItemType Directory -Force -Path $categoryDir | Out-Null

$brandColors = @{
  'Amul' = '#0B6EB8'
  'Tata' = '#175DA8'
  'Parle' = '#D71920'
  'Britannia' = '#C8102E'
  'Maggi' = '#F2C300'
  'Coca-Cola' = '#E41E2B'
  'Pepsi' = '#004B93'
  'Surf Excel' = '#008DDA'
  'Vim' = '#1FA64A'
  'Colgate' = '#E31B23'
  'Aashirvaad' = '#B21E28'
  'Fortune' = '#F47B20'
  'Nescafe' = '#6F1D1B'
}

function ColorFromHex($hex) {
  $h = $hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb(
    [Convert]::ToInt32($h.Substring(0, 2), 16),
    [Convert]::ToInt32($h.Substring(2, 2), 16),
    [Convert]::ToInt32($h.Substring(4, 2), 16)
  )
}

function Save-Png($bitmap, $path) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function Draw-WrappedText($graphics, $text, $font, $brush, $x, $y, $width, $lineHeight, $maxLines) {
  $words = ($text -split '\s+')
  $line = ''
  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($word in $words) {
    $test = if ($line.Length -eq 0) { $word } else { "$line $word" }
    if ($graphics.MeasureString($test, $font).Width -le $width) {
      $line = $test
    } else {
      if ($line.Length -gt 0) { $lines.Add($line) }
      $line = $word
    }
  }
  if ($line.Length -gt 0) { $lines.Add($line) }
  $count = [Math]::Min($maxLines, $lines.Count)
  for ($i = 0; $i -lt $count; $i++) {
    $graphics.DrawString($lines[$i], $font, $brush, [float]$x, [float]($y + ($i * $lineHeight)))
  }
}

function New-ProductImage($product, $index) {
  $slug = $product.id -replace '^prod-', ''
  $brand = [string]$product.brand
  $hex = if ($brandColors.ContainsKey($brand)) { $brandColors[$brand] } else { '#0B7A4B' }
  $primary = ColorFromHex $hex
  $bgTop = [System.Drawing.Color]::FromArgb(236, 251, 243)
  $bgBottom = [System.Drawing.Color]::FromArgb(255, 255, 255)
  $bmp = New-Object System.Drawing.Bitmap 900, 700
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $rect = New-Object System.Drawing.Rectangle 0, 0, 900, 700
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $bgTop, $bgBottom, 45
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  $shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 0, 0, 0))
  $g.FillEllipse($shadow, 260, 600, 380, 38)
  $shadow.Dispose()

  $pack = New-Object System.Drawing.Rectangle 270, 88, 360, 520
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $g.FillRectangle($white, $pack)
  $white.Dispose()
  $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(225, 225, 225)), 3
  $g.DrawRectangle($borderPen, $pack)
  $borderPen.Dispose()

  $brandBrush = New-Object System.Drawing.SolidBrush $primary
  $g.FillRectangle($brandBrush, 270, 88, 360, 96)
  $brandFont = New-Object System.Drawing.Font 'Arial', 34, ([System.Drawing.FontStyle]::Bold)
  $brandTextBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  Draw-WrappedText $g $brand $brandFont $brandTextBrush 292 112 315 42 1

  $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, $primary.R, $primary.G, $primary.B))
  $g.FillEllipse($accent, 330, 220, 240, 190)
  $g.FillEllipse($accent, 370, 390, 160, 100)
  $accent.Dispose()

  $nameBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 45, 35))
  $nameFont = New-Object System.Drawing.Font 'Arial', 26, ([System.Drawing.FontStyle]::Bold)
  Draw-WrappedText $g ([string]$product.name) $nameFont $nameBrush 306 428 292 36 3

  $metaFont = New-Object System.Drawing.Font 'Arial', 18, ([System.Drawing.FontStyle]::Regular)
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(72, 91, 82))
  $g.DrawString("MOQ $($product.moq) | GST $($product.gst_rate)%", $metaFont, $muted, 306, 548)
  $g.DrawString([string]$product.pack_size, $metaFont, $muted, 306, 575)

  $priceFont = New-Object System.Drawing.Font 'Arial', 24, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("Rs. $($product.wholesale_price)", $priceFont, $brandBrush, 38, 45)
  $chipFont = New-Object System.Drawing.Font 'Arial', 16, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("B2B WHOLESALE", $chipFont, $brandBrush, 38, 92)

  $brandBrush.Dispose()
  $brandTextBrush.Dispose()
  $brandFont.Dispose()
  $nameBrush.Dispose()
  $nameFont.Dispose()
  $metaFont.Dispose()
  $muted.Dispose()
  $priceFont.Dispose()
  $chipFont.Dispose()
  $g.Dispose()
  Save-Png $bmp (Join-Path $productDir "$slug.png")
}

function New-CategoryImage($category) {
  $slug = [string]$category.slug
  $bmp = New-Object System.Drawing.Bitmap 700, 520
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $rect = New-Object System.Drawing.Rectangle 0, 0, 700, 520
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (ColorFromHex '#EAF8EF'), (ColorFromHex '#FFFFFF'), 45
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()
  $green = New-Object System.Drawing.SolidBrush (ColorFromHex '#0B7A4B')
  $light = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 196, 232, 205))
  $g.FillEllipse($light, 155, 74, 390, 280)
  $g.FillEllipse($green, 238, 128, 230, 160)
  $g.FillRectangle($green, 210, 336, 280, 16)
  $font = New-Object System.Drawing.Font 'Arial', 34, ([System.Drawing.FontStyle]::Bold)
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(24, 45, 35))
  Draw-WrappedText $g ([string]$category.name) $font $textBrush 72 386 560 46 2
  $green.Dispose()
  $light.Dispose()
  $font.Dispose()
  $textBrush.Dispose()
  $g.Dispose()
  Save-Png $bmp (Join-Path $categoryDir "$slug.png")
}

$products = Get-Content (Join-Path $seedDir 'products_seed.json') -Raw | ConvertFrom-Json
$categories = Get-Content (Join-Path $seedDir 'categories_seed.json') -Raw | ConvertFrom-Json

for ($i = 0; $i -lt $products.Count; $i++) {
  New-ProductImage $products[$i] $i
}
foreach ($category in $categories) {
  New-CategoryImage $category
}

Write-Host "Generated $($products.Count) product PNGs and $($categories.Count) category PNGs in $storageDir"
