# Define the path to your media directory
$mediaPath = "C:\Users\Kevin\Documents\projects\BillKockritzMemorial\media"

# Find all HEIC/heic files in the folder
$heicFiles = Get-ChildItem -Path $mediaPath -Include *.heic, *.HEIC -File -Recurse

if ($heicFiles.Count -eq 0) {
    Write-Host "No HEIC files found in $mediaPath" -ForegroundColor Yellow
} else {
    Write-Host "Found $($heicFiles.Count) HEIC file(s). Starting conversion..." -ForegroundColor Cyan

    foreach ($file in $heicFiles) {
        $outputPath = [System.IO.Path]::ChangeExtension($file.FullName, ".jpg")

        Write-Host "Converting: $($file.Name) -> $([System.IO.Path]::GetFileName($outputPath))" -ForegroundColor Gray

        # -quality 100 ensures maximum fidelity without downscaling pixel dimensions
        # -auto-orient ensures iPhone/camera orientation tags are respected
        magick $file.FullName -auto-orient -quality 100 $outputPath
    }

    Write-Host "All conversions completed successfully!" -ForegroundColor Green
}