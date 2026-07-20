using System.Text;
using System.Text.RegularExpressions;

namespace FaynoShop.API.Services;

internal static partial class SlugGenerator
{
    private static readonly IReadOnlyDictionary<char, string> Transliteration = new Dictionary<char, string>
    {
        ['а'] = "a", ['б'] = "b", ['в'] = "v", ['г'] = "h", ['ґ'] = "g", ['д'] = "d",
        ['е'] = "e", ['є'] = "ye", ['ж'] = "zh", ['з'] = "z", ['и'] = "y", ['і'] = "i",
        ['ї'] = "yi", ['й'] = "y", ['к'] = "k", ['л'] = "l", ['м'] = "m", ['н'] = "n",
        ['о'] = "o", ['п'] = "p", ['р'] = "r", ['с'] = "s", ['т'] = "t", ['у'] = "u",
        ['ф'] = "f", ['х'] = "kh", ['ц'] = "ts", ['ч'] = "ch", ['ш'] = "sh", ['щ'] = "shch",
        ['ь'] = "", ['ю'] = "yu", ['я'] = "ya"
    };

    public static string From(string value, int maxLength)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var ch in value.Trim().ToLowerInvariant())
        {
            if (Transliteration.TryGetValue(ch, out var mapped))
            {
                builder.Append(mapped);
            }
            else if (char.IsLetterOrDigit(ch))
            {
                builder.Append(ch);
            }
            else
            {
                builder.Append('-');
            }
        }

        var slug = NonSlugCharacters().Replace(builder.ToString(), "-").Trim('-');
        return slug.Length <= maxLength ? slug : slug[..maxLength].TrimEnd('-');
    }

    [GeneratedRegex("[^a-z0-9-]+")]
    private static partial Regex NonSlugCharacters();
}
