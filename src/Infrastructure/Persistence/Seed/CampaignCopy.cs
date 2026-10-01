using System.Globalization;

namespace GiveAID.Infrastructure.Persistence.Seed;

/// <summary>
/// Produces the About-This-Campaign body for a Campaign row in the seed
/// data set. Each generated description is tied to its campaign's title,
/// programme type, beneficiary count and fundraising progress so that
/// every detail page on the public site reads as a distinct, contextual
/// story instead of a generic placeholder.
///
/// The writing follows the structure used across the site:
///   1. The situation the campaign addresses — led by the campaign title.
///   2. What the campaign is providing or improving for the children.
///   3. How donations help and a call to action.
///
/// All wording is intentionally kept generic enough to match a
/// professional children's NGO without inventing specific facts that
/// are not present in the database (no exact towns, schools, hospitals
/// or numbers beyond the campaign's own GoalAmount / RaisedAmount /
/// BeneficiariesCount / CampaignCode).
/// </summary>
public static class CampaignCopy
{
    /// <summary>
    /// Builds a 120-220 word description tailored to the supplied
    /// campaign metadata. The title is treated as the headline subject;
    /// cause/programme pick the supporting paragraphs.
    /// </summary>
    public static string Build(
        string campaignName,
        string causeName,
        string programmeType,
        int beneficiariesCount,
        decimal goalAmount,
        decimal raisedAmount,
        string status)
    {
        var pct = goalAmount > 0
            ? Math.Min(100m, (raisedAmount / goalAmount) * 100m)
            : 0m;
        var pctRounded = Math.Round(pct, 1);

        var prog = NormalizeProgramme(programmeType);
        var subject = ExtractSubject(campaignName);
        var goal = FormatVnd(goalAmount);
        var raised = FormatVnd(raisedAmount);
        var people = beneficiariesCount.ToString("N0", CultureInfo.InvariantCulture);

        var p1 = BuildSituation(subject, causeName, prog, status);
        var p2 = BuildProvision(subject, prog, people);
        var p3 = BuildCallToAction(subject, prog, raised, goal, pctRounded, status);

        return $"{p1}\n\n{p2}\n\n{p3}";
    }

    // ────────────────────────────────────────────────────────────────────
    // Section builders — each returns one paragraph as a single string.
    // ────────────────────────────────────────────────────────────────────

    private static string BuildSituation(
        SubjectRef subject, string causeName, ProgrammeProfile prog, string status)
    {
        // Cause-specific opener that sets the broader context.
        var causeLine = causeName switch
        {
            "Education for Children" =>
                "Across Vietnam, many children still do not have the books, classrooms, "
              + "or daily support they need to stay in school.",
            "Healthcare Support" =>
                "For children in remote communities, even basic healthcare can feel out "
              + "of reach — a long trip, a missing specialist, or a cost a family cannot cover.",
            "Child Welfare" =>
                "Too many children grow up without the simple safety net that lets them "
              + "play, learn and simply be kids.",
            "Emergency Relief" =>
                "When a flood, storm or other emergency hits, children are always the most "
              + "vulnerable members of any community.",
            "Women Empowerment" =>
                "When young women and girls are supported early, whole communities grow stronger.",
            _ =>
                "Behind every figure we publish is a child whose daily life is harder than it should be."
        };

        // The title's main phrase is what makes each opening unique.
        var subjectLine = subject.IsEmpty
            ? "This campaign responds to that reality"
            : subject.Value;

        var nuance = prog.Kind switch
        {
            ProgrammeKind.Education =>
                "Long commutes, missing supplies and out-of-pocket costs are still the "
                + "reasons many children drop out before they finish primary school",
            ProgrammeKind.CleanWater =>
                "Without safe water close to home, families spend hours each day collecting "
                + "what they need, and children are the first to fall sick",
            ProgrammeKind.Nutrition =>
                "A missed meal is more than hunger; it is a missed lesson, a slower recovery "
                + "and a heavier day at school",
            ProgrammeKind.WinterClothing =>
                "Cold seasons turn small discomforts into real health risks for children who "
                + "do not have a warm jacket, shoes or blanket to count on",
            ProgrammeKind.FamilySupport =>
                "When a parent is overwhelmed, the children carry the rest — school bags, "
                + "household chores and worries far beyond their years",
            ProgrammeKind.Playground =>
                "Play is not a luxury — it is how children learn to trust, share and grow. "
                + "Without a safe place to play, that part of childhood quietly disappears",
            ProgrammeKind.ChildSponsorship =>
                "Steady, predictable support is what lets a child plan a year, a school term "
                + "and a future — not just survive the next week",
            ProgrammeKind.ChildWelfare =>
                "Day-to-day safety nets — a full meal, a safe place to sleep, a caring "
                + "adult — are what let children focus on simply growing up",
            ProgrammeKind.EmergencyRelief =>
                "When a flood, storm or other crisis hits, the first hours and days decide "
                + "whether a family recovers quickly or loses everything",
            ProgrammeKind.Infrastructure =>
                "A muddy path, a leaking roof or a missing classroom can quietly decide "
                + "whether a child makes it to school at all",
            ProgrammeKind.Healthcare =>
                "Routine check-ups, treatment for common illnesses and basic health education "
                + "change a child's whole trajectory",
            _ =>
                "Small, consistent support changes the day-to-day life of a child more than "
                + "most people realise"
        };

        var statusTail = status switch
        {
            "Completed" => " The campaign has now reached completion and every donor contribution has been put to work.",
            "Paused"    => " The campaign is currently paused while we confirm the next phase of delivery with our partners.",
            _           => string.Empty
        };

        return $"{causeLine} {subjectLine}. {nuance}.{statusTail}";
    }

    private static string BuildProvision(
        SubjectRef subject, ProgrammeProfile prog, string people)
    {
        var subjectTail = subject.IsEmpty ? "The campaign" : "It";
        var provision = prog.Kind switch
        {
            ProgrammeKind.Education =>
                $"{subjectTail} funds the materials, transport and learning support that keep "
              + $"{people} children in class — from school bags and supplies to bicycles and "
              + "after-school mentoring that make the difference between attending and dropping out.",
            ProgrammeKind.CleanWater =>
                $"{subjectTail} helps install safe water points, protect natural springs and "
              + "bring reliable tap water closer to where families live, so children spend "
              + "less time walking and more time learning and playing.",
            ProgrammeKind.Nutrition =>
                $"{subjectTail} supports daily school meals, food parcels for the most "
              + "vulnerable families and kitchen upgrades that turn a single harvest into "
              + "many full bowls for the children who need them most.",
            ProgrammeKind.WinterClothing =>
                $"{subjectTail} delivers warm jackets, shoes, blankets and rain gear to "
              + "children who would otherwise face the cold season in threadbare clothes, "
              + "and partners with local tailors to keep the help close to home.",
            ProgrammeKind.FamilySupport =>
                $"{subjectTail} provides counselling, parenting workshops and direct relief "
              + "to families under pressure, so children can lean on the adults around them "
              + "instead of carrying the household on their own shoulders.",
            ProgrammeKind.Playground =>
                $"{subjectTail} builds safe playgrounds, sports areas and child-friendly "
              + "corners in communities where a kid's only outdoor space today is a dirt "
              + "yard or a busy road.",
            ProgrammeKind.ChildSponsorship =>
                $"{subjectTail} connects each sponsored child with a long-term supporter "
              + "who helps cover school fees, healthcare, daily meals and learning materials "
              + "for the full school year.",
            ProgrammeKind.ChildWelfare =>
                $"{subjectTail} covers the everyday essentials — nutritious meals, a safe "
              + $"place to sleep, books and uniforms, and the staff who keep the routines "
              + $"running — so {people} children can simply be kids while they grow.",
            ProgrammeKind.EmergencyRelief =>
                $"{subjectTail} delivers food, clean water, medicine and cash grants in the "
              + "first hours and days after a crisis, working side-by-side with local "
                + $"responders so {people} affected households get help quickly.",
            ProgrammeKind.Infrastructure =>
                $"{subjectTail} funds the practical upgrades — safer paths, repaired classrooms, "
              + "lighting and sanitation — that turn a long walk into a short walk and a "
              + "difficult classroom into a usable one.",
            ProgrammeKind.Healthcare =>
                $"{subjectTail} pays for routine check-ups, treatment for common childhood "
              + "illnesses and health-education sessions for both children and their caregivers.",
            _ =>
                $"{subjectTail} channels donor support into the day-to-day help that makes "
              + "the biggest difference to the children and families we work with."
        };
        return provision;
    }

    private static string BuildCallToAction(
        SubjectRef subject, ProgrammeProfile prog,
        string raised, string goal, decimal pct, string status)
    {
        var progressLine = pct switch
        {
            >= 100m => $"Together we have already met the fundraising goal of {goal}, and every additional contribution is now directed to the next community in the programme pipeline.",
            >= 75m  => $"With {raised} raised towards a {goal} goal ({pct:0.0}%), we are close to fully funding this programme and can expand it to the next group of children once we cross the line.",
            >= 40m  => $"So far {raised} of the {goal} target has been raised ({pct:0.0}%). Each new donation moves us a step closer to keeping our commitment to every child registered in this campaign.",
            _       => $"We have raised {raised} so far against a {goal} goal ({pct:0.0}%). Reaching the full target means we can stay with every child from start to finish, without cutting the programme short."
        };

        var ask = prog.Kind switch
        {
            ProgrammeKind.Education =>
                "Your donation covers the supplies, transport and mentorship that keep a "
              + "child in school this term — and the next, and the one after that.",
            ProgrammeKind.CleanWater =>
                "Every contribution goes directly into the materials and local labour needed "
              + "to bring safe water closer to the children who need it.",
            ProgrammeKind.Nutrition =>
                "Your gift fills a bowl, stocks a school kitchen or tops up a family food "
              + "parcel for a child who would otherwise go without.",
            ProgrammeKind.WinterClothing =>
                "A donation of any size buys a jacket, a pair of shoes or a blanket for a "
              + "child facing the cold season without proper clothing.",
            ProgrammeKind.FamilySupport =>
                "Your support gives a struggling family the breathing room they need to "
              + "care for their children properly for another month.",
            ProgrammeKind.Playground =>
                "Help us turn an empty patch of ground into a real place to play, where "
              + "every child in the community is welcome.",
            ProgrammeKind.ChildSponsorship =>
                "Becoming a sponsor is the most powerful way to change one child's whole "
              + "school year — and their outlook on what is possible.",
            ProgrammeKind.ChildWelfare =>
                "Your gift keeps the lights, kitchens and classrooms running for children "
              + "who rely on us for the everyday basics of growing up.",
            ProgrammeKind.EmergencyRelief =>
                "In an emergency, even a small contribution reaches a family in need within "
              + "hours — please give what you can as soon as you can.",
            ProgrammeKind.Infrastructure =>
                "Your donation helps us complete the practical upgrades that decide "
              + "whether a child makes it to school safely each morning.",
            ProgrammeKind.Healthcare =>
                "From a single check-up to a full course of treatment, your gift keeps a "
              + "child healthy enough to learn, play and grow.",
            _ =>
                "Whatever you can give today helps us stay consistent for the children and "
                + "families who are counting on this programme."
        };

        // Use a human subject for the CTA instead of "It" (the verbatim title
        // often reads awkwardly as a pronoun, especially for short titles).
        var subjectForCta = subject.IsEmpty ? "this campaign" : "this campaign";

        var cta = status switch
        {
            "Completed" =>
                $"Thank you for being part of what we accomplished together. {progressLine} "
              + "If you would like to continue supporting our work, our other active "
              + "campaigns would warmly welcome your next gift.",
            _ =>
                $"{progressLine} {ask} Stand with {subjectForCta} today and help give every "
              + "child in this campaign the steady support they deserve."
        };

        return cta;
    }

    // ────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Strips the donation-CTA suffix (": Donate Today", "— Help Them Thrive", etc.)
    /// so we can reuse the title as a clean subject in sentences.
    /// </summary>
    private static SubjectRef ExtractSubject(string campaignName)
    {
        if (string.IsNullOrWhiteSpace(campaignName))
        {
            return SubjectRef.Empty;
        }

        string[] ctaSuffixes =
        {
            ": Donate Today", "— Donate Today", " - Donate Today",
            ": Help Them Thrive", "— Help Them Thrive",
            ": Sponsor a Child Today", "— Sponsor a Child Today",
            ": Fund Their Future Today", "— Fund Their Future Today",
            ": Donate Now", "— Donate Now",
            ": Fund a Classroom", "— Fund a Classroom",
            ": Fund a Child's Education Today", "— Fund a Child's Education Today"
        };

        var clean = campaignName;
        foreach (var s in ctaSuffixes)
        {
            if (clean.EndsWith(s, StringComparison.Ordinal))
            {
                clean = clean[..^s.Length].TrimEnd(' ', ',', ':', '—', '-');
                break;
            }
        }

        clean = clean.TrimStart(' ', ':', '—', '-').TrimEnd(',', ' ');

        return string.IsNullOrWhiteSpace(clean) ? SubjectRef.Empty : new SubjectRef(clean);
    }

    private static ProgrammeProfile NormalizeProgramme(string programmeType)
    {
        if (string.IsNullOrWhiteSpace(programmeType))
        {
            return new ProgrammeProfile(ProgrammeKind.General);
        }

        var key = programmeType.Trim().ToLowerInvariant();
        return key switch
        {
            "education"        => new ProgrammeProfile(ProgrammeKind.Education),
            "scholarship"      => new ProgrammeProfile(ProgrammeKind.Education),
            "cleanwater"       => new ProgrammeProfile(ProgrammeKind.CleanWater),
            "water"            => new ProgrammeProfile(ProgrammeKind.CleanWater),
            "nutrition"        => new ProgrammeProfile(ProgrammeKind.Nutrition),
            "food"             => new ProgrammeProfile(ProgrammeKind.Nutrition),
            "winterclothing"   => new ProgrammeProfile(ProgrammeKind.WinterClothing),
            "clothing"         => new ProgrammeProfile(ProgrammeKind.WinterClothing),
            "familysupport"    => new ProgrammeProfile(ProgrammeKind.FamilySupport),
            "playground"       => new ProgrammeProfile(ProgrammeKind.Playground),
            "childsponsorship" => new ProgrammeProfile(ProgrammeKind.ChildSponsorship),
            "childwelfare"     => new ProgrammeProfile(ProgrammeKind.ChildWelfare),
            "emergencyrelief"  => new ProgrammeProfile(ProgrammeKind.EmergencyRelief),
            "emergency"        => new ProgrammeProfile(ProgrammeKind.EmergencyRelief),
            "infrastructure"   => new ProgrammeProfile(ProgrammeKind.Infrastructure),
            "healthcare"       => new ProgrammeProfile(ProgrammeKind.Healthcare),
            _                  => new ProgrammeProfile(ProgrammeKind.General)
        };
    }

    private static string FormatVnd(decimal amount)
    {
        if (amount >= 1_000_000_000m)
        {
            var billions = amount / 1_000_000_000m;
            return $"VND {billions:0.#} billion";
        }
        if (amount >= 1_000_000m)
        {
            var millions = amount / 1_000_000m;
            return $"VND {millions:0.#} million";
        }
        return $"VND {amount:N0}";
    }

    private enum ProgrammeKind
    {
        General,
        Education,
        CleanWater,
        Nutrition,
        WinterClothing,
        FamilySupport,
        Playground,
        ChildSponsorship,
        ChildWelfare,
        EmergencyRelief,
        Infrastructure,
        Healthcare
    }

    private readonly record struct ProgrammeProfile(ProgrammeKind Kind);

    private readonly record struct SubjectRef(string Value)
    {
        public static readonly SubjectRef Empty = new(string.Empty);
        public bool IsEmpty => string.IsNullOrWhiteSpace(Value);
    }
}