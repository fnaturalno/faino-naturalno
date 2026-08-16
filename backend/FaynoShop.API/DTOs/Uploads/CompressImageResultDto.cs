namespace FaynoShop.API.DTOs.Uploads;

public sealed record CompressImageResultDto(
    string OriginalFile,
    string CompressedFile,
    long OriginalKb,
    long CompressedKb,
    int DbUpdated);
