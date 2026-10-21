# Descarga fotos libres (Wikimedia Commons) de Pasto y de seguridad para AlertaBarrio
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$ua = "AlertaBarrio-proyecto/1.0 (estudiante)"
$dest = Join-Path (Get-Location) "public\pasto"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$fotos = @(
  @{ file = "galeras.jpg";  q = @("Volcan Galeras Pasto", "Galeras volcano") },
  @{ file = "cocha.jpg";    q = @("Laguna de la Cocha", "Lago Guamues") },
  @{ file = "catedral.jpg"; q = @("Catedral de Pasto", "Iglesia San Juan Bautista Pasto", "Pasto Narino iglesia") },
  @{ file = "carnaval.jpg"; q = @("Carnaval de Negros y Blancos", "Carnaval de Pasto carroza") },
  @{ file = "plaza.jpg";    q = @("Plaza de Narino Pasto", "Pasto Narino Colombia") },
  @{ file = "policia.jpg";  q = @("Policia Nacional de Colombia patrulla", "Policia Nacional de Colombia") },
  @{ file = "camara.jpg";   q = @("CCTV camera street", "security camera pole") },
  @{ file = "vecinos.jpg";  q = @("Neighbourhood Watch sign", "neighborhood watch") }
)

function Limpio($html) { if (-not $html) { return "" }; return (($html -replace "<[^>]+>", "") -replace "\s+", " ").Trim() }

$creditos = @()
foreach ($f in $fotos) {
  $elegida = $null
  foreach ($q in $f.q) {
    $url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1600&format=json&gsrsearch=" + [uri]::EscapeDataString($q)
    $r = Invoke-RestMethod -Uri $url -UserAgent $ua
    if (-not $r.query) { continue }
    $pages = $r.query.pages.PSObject.Properties.Value | Sort-Object index
    foreach ($p in $pages) {
      $ii = $p.imageinfo[0]
      if ($ii.mime -ne "image/jpeg") { continue }
      if ($ii.width -lt 1400 -or $ii.width -lt ($ii.height * 1.25)) { continue }
      $lic = $ii.extmetadata.LicenseShortName.value
      if ($lic -notmatch "^(CC0|Public domain|CC BY(-SA)? \d)") { continue }
      $elegida = @{ p = $p; ii = $ii; lic = $lic }; break
    }
    if ($elegida) { break }
  }
  if (-not $elegida) { Write-Host "No encontre foto para $($f.file)" -ForegroundColor Yellow; continue }

  $tmp = Join-Path $env:TEMP $f.file
  Invoke-WebRequest -Uri $elegida.ii.thumburl -OutFile $tmp -UserAgent $ua
  $src = [System.Drawing.Image]::FromFile($tmp)
  $w = [Math]::Min(1600, $src.Width); $h = [int]($src.Height * $w / $src.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = "HighQualityBicubic"; $g.DrawImage($src, 0, 0, $w, $h); $g.Dispose(); $src.Dispose()
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]78)
  $bmp.Save((Join-Path $dest $f.file), $codec, $ep); $bmp.Dispose(); Remove-Item $tmp

  $creditos += [ordered]@{
    file = $f.file
    title = ($elegida.p.title -replace "^File:", "")
    author = (Limpio $elegida.ii.extmetadata.Artist.value)
    license = $elegida.lic
    source = $elegida.ii.descriptionurl
  }
  Write-Host "OK $($f.file)  <- $($elegida.p.title)" -ForegroundColor Green
}
ConvertTo-Json -InputObject @($creditos) -Depth 3 | Set-Content -Encoding UTF8 (Join-Path $dest "creditos.json")

git fetch origin main
git switch -c fotos/pasto origin/main
git add public/pasto
git -c user.name=Santiago425 -c user.email=santycampoverde10-@live.com commit -m "Fotos de Pasto"
git push -u origin fotos/pasto
Write-Host "Listo, fotos subidas a la rama fotos/pasto" -ForegroundColor Green
