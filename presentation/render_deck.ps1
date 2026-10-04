# Renders a FarmRescue deck to PNGs (+ PDF) using the locally installed PowerPoint.
#
# Usage:
#   powershell -File presentation\render_deck.ps1 -Deck FarmRescue-Official-Deck.pptx
#   powershell -File presentation\render_deck.ps1 -Deck FarmRescue-Brief-7slides.pptx
param(
    [string]$Deck = "FarmRescue-Official-Deck.pptx"
)

$ErrorActionPreference = "Stop"
$root    = "E:\Desktop\FarmRescue\presentation"
$deckPath = Join-Path $root $Deck
$stem    = [System.IO.Path]::GetFileNameWithoutExtension($Deck)
$out     = Join-Path $root ("render-" + $stem)
$pdf     = Join-Path $root ($stem + ".pdf")

if (-not (Test-Path $deckPath)) { throw "Deck not found: $deckPath" }
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force -Path $out | Out-Null

$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($deckPath, $true, $false, $false)
    $pres.SaveAs($out, 18)     # ppSaveAsPNG = 18
    $pres.SaveAs($pdf, 32)     # ppSaveAsPDF = 32
    $pres.Close()
    Write-Output "RENDER_OK $stem"
} finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
Get-ChildItem -Recurse $out -Filter *.PNG | Measure-Object | Select-Object -ExpandProperty Count
