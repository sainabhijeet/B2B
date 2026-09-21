param(
  [string]$CatalogRoot = (Join-Path $PSScriptRoot '..\..\storage\grocery-catalog'),
  [string]$OnlyFile = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$catalogPath = [IO.Path]::GetFullPath($CatalogRoot)
$productsPath = Join-Path $catalogPath 'products'
$categoriesPath = Join-Path $catalogPath 'categories'
$downloadPath = Join-Path $catalogPath '.downloads'
$backupPath = Join-Path $catalogPath 'generated-backup-20260825'

New-Item -ItemType Directory -Force -Path $productsPath, $categoriesPath, $downloadPath | Out-Null
if (-not (Test-Path -LiteralPath $backupPath)) {
  New-Item -ItemType Directory -Path $backupPath | Out-Null
  Copy-Item -LiteralPath $productsPath -Destination $backupPath -Recurse
  Copy-Item -LiteralPath $categoriesPath -Destination $backupPath -Recurse
}

$productImages = [ordered]@{
  'aashirvaad-select-sharbati-atta-5kg.png' = 'https://image.aapkabazar.co/product/494/1697433474649.png?type=png'
  'aashirvaad-shudh-chakki-atta-10kg.png' = 'https://bf1af2.a-cdn.akinoncloud.com/products/2024/09/10/84684/45d7b9e0-24f7-403c-a62c-a758f8c16b65_size3840_cropCenter.jpg'
  'amul-butter-500g.png' = 'https://www.desideliveries.com/s/65a4de73b54747743907c4c5/641c2ff85ca5bb073bc2026f/pro-8-480x480.jpg'
  'amul-cheese-slices-200g.png' = 'https://spiceboxgrocery.com/cdn/shop/files/Amul_Cheese_slices_800x.png?v=1696719004'
  'amul-toned-milk-1l.png' = 'https://img.thecdn.in/359659/148715_2-amul-toned-milk-1711800353578.webp?format=jpeg&width=1000'
  'britannia-good-day-cashew-600g.png' = 'https://media.britannia.co.in/Good_Day_Cashew_180a081781.png'
  'britannia-milk-bikis-510g.png' = 'https://media.britannia.co.in/Milk_Bikis_e8d2d3c4ff.png'
  'coca-cola-750ml.png' = 'https://www.bbassets.com/media/uploads/p/xxl/251023_11-coca-cola-soft-drink-original-taste.jpg'
  'colgate-strong-teeth-200g.png' = 'https://www.gandhi-bazar.com/cdn/shop/products/colgate-strong-teeth-anticavity-toothpaste-200g.jpg?v=1616096406'
  'fortune-besan-1kg.png' = 'https://cdn.dotpe.in/longtail/store-items/CM_7005/160.jpg'
  'fortune-chakki-fresh-atta-10kg.png' = 'https://www.wholesalemartindia.in/auth/upload/product-photo/Fortune%20Atta.jpgP0912.jpg'
  'fortune-sunlite-sunflower-oil-1l.png' = 'https://www.mystore.in/s/62ea2c599d1398fa16dbae0a/67af7641fb10b8cb98c9f359/8906007280242_1.jpg'
  'maggi-2-minute-noodles-70g.png' = 'https://www.pngkey.com/png/detail/125-1254574_favorite-instant-noodle-brands-archive-maggi-2-minute.png'
  'maggi-rich-tomato-ketchup-1kg.png' = 'https://cdn.dmart.in/images/products/FEB120000395xx27FEB26vvG_5_B.jpg'
  'nescafe-classic-coffee-200g.png' = 'https://www.starquik.com/cdn/shop/files/SQ102755_FOP_db7508a9-4287-467f-9902-54b57b031d01.jpg?v=1776848166'
  'parle-monaco-salted-biscuits-400g.png' = 'https://jammubasket.com/images/products/879_parle-monaco-salted-biscuits-200-g-cf0321b960d481b237bd935d99b87ecb.jpeg'
  'parle-g-family-pack-800g.png' = 'https://aia-market.com/cdn/shop/products/parleGfamille_PARLE-G_Biscuits_Pack_Famille_800g_TVA7_Afrique_Inde_Asie_Latine_Bonbons_900_10_5.50_2_1500x.jpg?v=1679868690'
  'pepsi-750ml.png' = 'https://www.vishalmegamart.com/on/demandware.static/-/Sites-vmm-fmcg-master-catalog/default/dwaad2ec7d/images/large/1310013079.jpg'
  'surf-excel-easy-wash-1kg.png' = 'https://images-cdn.ubuy.co.in/66ee829f38ee607ba14377b1-easy-wash-detergent-powder-1-kg.jpg'
  'surf-excel-matic-liquid-2l.png' = 'https://cdn.dotpe.in/longtail/store-items/8782576/iZGCD51R.jpeg'
  'tata-salt-1kg.png' = 'https://spicecheck24.com/cdn/shop/files/tata_salt_1kg_cc1a0942-8c6b-465f-8c17-b18f8586a03f.png?v=1742469844&width=1000'
  'tata-sampann-toor-dal-1kg.png' = 'https://cdn.grofers.com/da/cms-assets/cms/product/64729800-0e10-489b-bced-9f50c775743b.jpg?ts=1733828007'
  'tata-tea-premium-1kg.png' = 'https://naxofoods.com/wp-content/uploads/2021/06/TATA-TEA-PREMIUM-POUCH-1KG-1.jpg'
  'vim-dishwash-bar-300g.png' = 'https://images.apollo247.in/pub/media/catalog/product/V/I/VIM0002_1-AUG23_1.jpg'
}

$categoryImages = [ordered]@{
  'baby-care.png' = 'https://owino.ug/public/uploads/categories/694190e1a155a_1765904609.jpg'
  'bakery.png' = 'https://www.bakeryandsnacks.com/resizer/v2/36XNLWOVJRDTDE2XE5Z2MGO5F4.jpg?auth=153fbf6bc25bbf1cc74cc9899de6068d78ff0c3c9dc1e818d82f0f85f34bab26'
  'beverages.png' = 'https://tandobeverage.com/wp-content/uploads/2022/08/how-to-start-a-beverage-company-1024x532-1.jpg'
  'biscuits-snacks.png' = 'https://media.britannia.co.in/Good_Day_Cashew_180a081781.png'
  'cleaning.png' = 'https://images-cdn.ubuy.co.in/66ee829f38ee607ba14377b1-easy-wash-detergent-powder-1-kg.jpg'
  'dairy.png' = 'https://img.thecdn.in/359659/148715_2-amul-toned-milk-1711800353578.webp?format=jpeg&width=1000'
  'dry-fruits.png' = 'https://www.usinesportsclub.com/wp-content/uploads/2021/03/set-pecan-pistachios-almond-peanut-cashew-pine-nuts-lined-up-assorted-nuts-dried-fruits-mini-different-bowls.jpg'
  'frozen-foods.png' = 'https://www.polygongroup.com/globalassets/english-united-states/blog-pics/marketscale-pics/frozen-2853290_1920.jpg?height=628&mode=crop&width=1200'
  'grocery-staples.png' = 'https://bf1af2.a-cdn.akinoncloud.com/products/2024/09/10/84684/45d7b9e0-24f7-403c-a62c-a758f8c16b65_size3840_cropCenter.jpg'
  'home-care.png' = 'https://images.apollo247.in/pub/media/catalog/product/V/I/VIM0002_1-AUG23_1.jpg'
  'oil-ghee.png' = 'https://www.mystore.in/s/62ea2c599d1398fa16dbae0a/67af7641fb10b8cb98c9f359/8906007280242_1.jpg'
  'personal-care.png' = 'https://www.gandhi-bazar.com/cdn/shop/products/colgate-strong-teeth-anticavity-toothpaste-200g.jpg?v=1616096406'
  'pulses-dal.png' = 'https://cdn.grofers.com/da/cms-assets/cms/product/64729800-0e10-489b-bced-9f50c775743b.jpg?ts=1733828007'
  'rice-flour.png' = 'https://image.aapkabazar.co/product/494/1697433474649.png?type=png'
  'spices.png' = 'https://images.moneycontrol.com/static-mcnews/2024/05/20240515072532_Health-benefits-of-Indian-spices.jpg?height=720&impolicy=website&width=1280'
  'stationery.png' = 'https://storage.googleapis.com/bc-ai-copywriter.appspot.com/pvbru9jpie/blog-images/210c607f-3641-4e77-84a3-79290cccf57c/choosing-the-right-notebooks-a-guide-for-students-and-professionals.jpg'
  'sugar-salt.png' = 'https://spicecheck24.com/cdn/shop/files/tata_salt_1kg_cc1a0942-8c6b-465f-8c17-b18f8586a03f.png?v=1742469844&width=1000'
  'tea-coffee.png' = 'https://naxofoods.com/wp-content/uploads/2021/06/TATA-TEA-PREMIUM-POUCH-1KG-1.jpg'
}

function Save-CatalogPng {
  param(
    [Parameter(Mandatory)] [string]$Url,
    [Parameter(Mandatory)] [string]$Destination,
    [Parameter(Mandatory)] [int]$Width,
    [Parameter(Mandatory)] [int]$Height,
    [switch]$Cover
  )

  $tempFile = Join-Path $downloadPath (([Guid]::NewGuid()).ToString('N') + '.image')
  try {
    Invoke-WebRequest -Uri $Url -OutFile $tempFile -UseBasicParsing -Headers @{
      'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GroceryCatalogAssetImporter/1.0'
      'Accept' = 'image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5'
    }

    $source = [Drawing.Image]::FromFile($tempFile)
    try {
      $canvas = New-Object Drawing.Bitmap($Width, $Height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $graphics = [Drawing.Graphics]::FromImage($canvas)
        try {
          $graphics.Clear([Drawing.Color]::White)
          $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
          $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality

          if ($Cover) {
            $scale = [Math]::Max($Width / $source.Width, $Height / $source.Height)
          } else {
            $scale = [Math]::Min(($Width - 72) / $source.Width, ($Height - 72) / $source.Height)
          }
          $drawWidth = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
          $drawHeight = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))
          $x = [int][Math]::Round(($Width - $drawWidth) / 2)
          $y = [int][Math]::Round(($Height - $drawHeight) / 2)
          $graphics.DrawImage($source, $x, $y, $drawWidth, $drawHeight)
        } finally {
          $graphics.Dispose()
        }
        $canvas.Save($Destination, [Drawing.Imaging.ImageFormat]::Png)
      } finally {
        $canvas.Dispose()
      }
    } finally {
      $source.Dispose()
    }
  } finally {
    Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
  }
}

$failed = [Collections.Generic.List[string]]::new()
$importedProducts = 0
$importedCategories = 0
foreach ($entry in $productImages.GetEnumerator()) {
  if ($OnlyFile -and $entry.Key -ne $OnlyFile) { continue }
  try {
    Save-CatalogPng -Url $entry.Value -Destination (Join-Path $productsPath $entry.Key) -Width 720 -Height 720
    $importedProducts++
    Write-Host "PRODUCT OK  $($entry.Key)"
  } catch {
    $failed.Add("PRODUCT $($entry.Key): $($_.Exception.Message)")
    Write-Warning $failed[$failed.Count - 1]
  }
}

foreach ($entry in $categoryImages.GetEnumerator()) {
  if ($OnlyFile -and $entry.Key -ne $OnlyFile) { continue }
  try {
    Save-CatalogPng -Url $entry.Value -Destination (Join-Path $categoriesPath $entry.Key) -Width 720 -Height 540 -Cover
    $importedCategories++
    Write-Host "CATEGORY OK $($entry.Key)"
  } catch {
    $failed.Add("CATEGORY $($entry.Key): $($_.Exception.Message)")
    Write-Warning $failed[$failed.Count - 1]
  }
}

Remove-Item -LiteralPath $downloadPath -Force -ErrorAction SilentlyContinue
if ($failed.Count -gt 0) {
  Write-Error ("Image import completed with {0} failure(s):`n{1}" -f $failed.Count, ($failed -join "`n"))
}

Write-Host "Imported $importedProducts product images and $importedCategories category images."
