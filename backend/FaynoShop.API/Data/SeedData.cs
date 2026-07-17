using FaynoShop.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Data;

public static class SeedData
{
    // Fixed reference time so "Новинка" and demo inventory stay deterministic across runs.
    private static readonly DateTime SeedReferenceUtc = new(2026, 7, 17, 12, 0, 0, DateTimeKind.Utc);

    public static async Task SeedAsync(AppDbContext context, IConfiguration config, CancellationToken ct = default)
    {
        var seedEnabled = config.GetValue("SeedDemoData", false)
            || string.Equals(
                Environment.GetEnvironmentVariable("SEED_DEMO_DATA"),
                "true",
                StringComparison.OrdinalIgnoreCase);

        if (!seedEnabled)
            return;

        if (await context.Categories.AnyAsync(ct))
            return;

        var categories = CreateCategories();
        context.Categories.AddRange(categories);
        await context.SaveChangesAsync(ct);

        context.Products.AddRange(CreateProducts(categories));
        await context.SaveChangesAsync(ct);
    }

    private static List<Category> CreateCategories() =>
    [
        new Category
        {
            Name = "Спеції",
            Slug = "spetsiyi",
            Description = "Натуральні спеції з усього світу",
            ImageUrl = "/assets/demo/category-spetsiyi.jpg",
            SortOrder = 1
        },
        new Category
        {
            Name = "Приправи",
            Slug = "prypravy",
            Description = "Готові суміші та приправи для щоденної кухні",
            ImageUrl = "/assets/demo/category-prypravy.jpg",
            SortOrder = 2
        },
        new Category
        {
            Name = "Чаї",
            Slug = "chayi",
            Description = "Трав'яні та класичні чаї без штучних добавок",
            ImageUrl = "/assets/demo/category-chayi.jpg",
            SortOrder = 3
        }
    ];

    private static List<Product> CreateProducts(IReadOnlyList<Category> categories)
    {
        var spices = categories.Single(c => c.Slug == "spetsiyi");
        var seasonings = categories.Single(c => c.Slug == "prypravy");
        var teas = categories.Single(c => c.Slug == "chayi");
        var now = SeedReferenceUtc;
        var recent = now.AddDays(-5);
        var older = now.AddDays(-60);

        return
        [
            // --- Спеції (5) ---
            Product(
                "Куркума мелена",
                "kurkuma-melena",
                spices.Id,
                "Яскрава куркума з насиченим ароматом для каррі та супів.",
                89.00m,
                oldPrice: 120.00m,
                imageUrl: "/assets/demo/product-1.jpg",
                weight: 100m,
                weightUnit: "г",
                stock: 48,
                featured: true,
                createdAt: older,
                updatedAt: older),
            Product(
                "Паприка солодка",
                "papryka-solodka",
                spices.Id,
                "М'яка солодка паприка для овочів і м'яса.",
                75.00m,
                oldPrice: null,
                imageUrl: "/assets/demo/product-2.jpg",
                weight: 80m,
                weightUnit: "г",
                stock: 35,
                featured: false,
                createdAt: recent,
                updatedAt: recent),
            Product(
                "Чорний перець горошок",
                "chornyy-perets-goroshok",
                spices.Id,
                "Цілі зерна чорного перцю для млинка.",
                95.00m,
                oldPrice: 110.00m,
                imageUrl: "/assets/demo/product-3.jpg",
                weight: 100m,
                weightUnit: "г",
                stock: 0,
                featured: false,
                createdAt: older,
                updatedAt: older),
            Product(
                "Кориця цейлонська",
                "korytsya-tseylonska",
                spices.Id,
                shortDescription: null,
                price: 130.00m,
                oldPrice: null,
                imageUrl: null,
                weight: 50m,
                weightUnit: "г",
                stock: 22,
                featured: false,
                createdAt: recent,
                updatedAt: recent,
                description: "Ніжна цейлонська кориця для випічки та напоїв."),
            Product(
                "Зіра ціла",
                "zira-tsila",
                spices.Id,
                "Ароматна зіра для плову та овочевих страв.",
                68.00m,
                oldPrice: null,
                imageUrl: "/assets/demo/product-5.jpg",
                weight: null,
                weightUnit: null,
                stock: 40,
                featured: false,
                createdAt: older,
                updatedAt: older),

            // --- Приправи (5) ---
            Product(
                "Хмелі-сунелі",
                "hmeli-suneli",
                seasonings.Id,
                "Класична грузинська суміш для м'яса та бобових.",
                72.00m,
                oldPrice: 95.00m,
                imageUrl: "/assets/demo/product-6.jpg",
                weight: 50m,
                weightUnit: "г",
                stock: 55,
                featured: true,
                createdAt: older,
                updatedAt: older),
            Product(
                "Суміш для шашлику",
                "sumish-dlya-shashlyku",
                seasonings.Id,
                "Готова приправа з паприкою, коріандром і часником.",
                85.00m,
                oldPrice: null,
                imageUrl: "/assets/demo/product-7.jpg",
                weight: 60m,
                weightUnit: "г",
                stock: 30,
                featured: false,
                createdAt: recent,
                updatedAt: recent),
            Product(
                "Прованські трави",
                "provanski-travy",
                seasonings.Id,
                "Ароматна суміш середземноморських трав.",
                78.00m,
                oldPrice: 90.00m,
                imageUrl: "/assets/demo/product-8.jpg",
                weight: 40m,
                weightUnit: "г",
                stock: 0,
                featured: false,
                createdAt: older,
                updatedAt: older),
            Product(
                "Адджика суха",
                "adzhyka-sukha",
                seasonings.Id,
                shortDescription: null,
                price: 64.00m,
                oldPrice: null,
                imageUrl: "/assets/demo/product-9.jpg",
                weight: 50m,
                weightUnit: "г",
                stock: 18,
                featured: false,
                createdAt: older,
                updatedAt: older,
                description: "Гостра суха аджика для соусів і маринадів."),
            Product(
                "Гірчиця зернова",
                "girchytsya-zernova",
                seasonings.Id,
                "Цілі зерна гірчиці для маринадів і солінь.",
                55.00m,
                oldPrice: null,
                imageUrl: null,
                weight: 100m,
                weightUnit: "г",
                stock: 70,
                featured: false,
                createdAt: older,
                updatedAt: older),

            // --- Чаї (5) ---
            Product(
                "Іван-чай ферментований",
                "ivan-chay-fermentovanyy",
                teas.Id,
                "М'який український іван-чай без кофеїну.",
                145.00m,
                oldPrice: 180.00m,
                imageUrl: "/assets/demo/product-10.jpg",
                weight: 100m,
                weightUnit: "г",
                stock: 42,
                featured: true,
                createdAt: older,
                updatedAt: older),
            Product(
                "Ромашковий чай",
                "romashkovyy-chay",
                teas.Id,
                "Квіти ромашки для вечірнього заспокійливого напою.",
                98.00m,
                oldPrice: null,
                imageUrl: "/assets/demo/product-11.jpg",
                weight: 50m,
                weightUnit: "г",
                stock: 28,
                featured: false,
                createdAt: recent,
                updatedAt: recent),
            Product(
                "М'ятний чай",
                "myatnyy-chay",
                teas.Id,
                "Свіжа м'ята для освіжаючого чаю.",
                88.00m,
                oldPrice: 105.00m,
                imageUrl: "/assets/demo/product-12.jpg",
                weight: 40m,
                weightUnit: "г",
                stock: 0,
                featured: false,
                createdAt: older,
                updatedAt: older),
            Product(
                "Чай каркаде",
                "chay-karkade",
                teas.Id,
                shortDescription: null,
                price: 110.00m,
                oldPrice: null,
                imageUrl: "/assets/demo/product-13.jpg",
                weight: null,
                weightUnit: null,
                stock: 33,
                featured: false,
                createdAt: recent,
                updatedAt: recent,
                description: "Квіти гібіскусу з яскравою кислинкою."),
            Product(
                "Зелений чай сенча",
                "zelenyy-chay-sencha",
                teas.Id,
                "Класична японська сенча з трав'янистим смаком.",
                160.00m,
                oldPrice: null,
                imageUrl: null,
                weight: 100m,
                weightUnit: "г",
                stock: 25,
                featured: false,
                createdAt: older,
                updatedAt: older),

            // Inactive product — must not appear in public catalog counts/lists
            Product(
                "Архівна суміш (неактивна)",
                "arkhivna-sumish-neaktyvna",
                seasonings.Id,
                "Прихована позиція для перевірки IsActive-фільтра.",
                40.00m,
                oldPrice: null,
                imageUrl: "/assets/demo/product-inactive.jpg",
                weight: 30m,
                weightUnit: "г",
                stock: 10,
                featured: false,
                createdAt: older,
                updatedAt: older,
                isActive: false)
        ];
    }

    private static Product Product(
        string name,
        string slug,
        int categoryId,
        string? shortDescription,
        decimal price,
        decimal? oldPrice,
        string? imageUrl,
        decimal? weight,
        string? weightUnit,
        int stock,
        bool featured,
        DateTime createdAt,
        DateTime updatedAt,
        string? description = null,
        bool isActive = true) =>
        new()
        {
            Name = name,
            Slug = slug,
            Description = description ?? shortDescription,
            ShortDescription = shortDescription,
            Price = price,
            OldPrice = oldPrice,
            ImageUrl = imageUrl,
            ImageUrls = imageUrl is null ? [] : [imageUrl],
            StockQuantity = stock,
            Weight = weight,
            WeightUnit = weightUnit,
            IsActive = isActive,
            IsFeatured = featured,
            CategoryId = categoryId,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };
}
