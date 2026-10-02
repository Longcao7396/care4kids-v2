using Microsoft.EntityFrameworkCore;
using GiveAID.Domain.Entities;
using GiveAID.Infrastructure.Security;

namespace GiveAID.Infrastructure.Persistence.Seed;

public static class SeedData
{
    /// <summary>
    /// Seeds the database with baseline data if tables are empty.
    /// </summary>
    /// <returns>True if seed completed (data was inserted), false if skipped
    /// because data already exists or an exception occurred.</returns>
    public static async Task<bool> SeedAsync(GiveAIDDbContext context)
    {
        // Ensure database is created
        await context.Database.EnsureCreatedAsync();

        // Always run the user-seeding step. SeedUsersAsync is idempotent
        // and safe on populated databases: it re-hashes the canonical
        // admin row only (so documented ADMIN_PASSWORD credentials work
        // across re-runs) and leaves every other account untouched.
        var passwordHasher = new PasswordHasher();
        await SeedUsersAsync(context, passwordHasher);

        // Always run the per-table idempotent seeders. Each is keyed on its
        // own natural key (organization name, campaign code, …) so re-runs
        // are no-ops once the data is present.
        await SeedCausesAsync(context);
        await SeedCmsPagesAsync(context);
        await SeedFaqsAsync(context);
        await SeedOrganizationsAsync(context); // <-- TASK 1 fix
        await SeedCampaignsAsync(context);
        await SeedGalleryAsync(context);
        await SeedAchievementsAsync(context);
        await SeedTeamMembersAsync(context);
        await SeedCareersAsync(context);
        await SeedDonationsAsync(context);
        await SeedExtraCmsPagesAsync(context);

        return true;
    }

    private static async Task SeedCausesAsync(GiveAIDDbContext context)
    {
        if (await context.Causes.AnyAsync()) return;

        var causes = new List<Cause>
            {
                // ── Care4Kids (children's welfare) parent causes ───────────
                // These are the only causes the Donation page is allowed to
                // expose on a Care4Kids site. The Donation page calls
                // GET /api/v1/causes/tree, which filters IsActive = true.
                // Generic NGO categories (Women Empowerment, Environment,
                // Emergency Relief, Elderly Care, Disability Support,
                // Animal Welfare) are intentionally NOT seeded here.
                new Cause { CauseCode = "EDU", CauseName = "Education for Children", Description = "Support education initiatives for underprivileged children", Icon = "graduation-cap", TargetAmount = 500000000, IsActive = true, DisplayOrder = 1, CreatedAt = DateTime.UtcNow },
                new Cause { CauseCode = "HEALTH", CauseName = "Healthcare Support", Description = "Provide healthcare access to those in need", Icon = "heartbeat", TargetAmount = 750000000, IsActive = true, DisplayOrder = 2, CreatedAt = DateTime.UtcNow },
                new Cause { CauseCode = "CHILD", CauseName = "Child Welfare", Description = "Protect and support vulnerable children", Icon = "child", TargetAmount = 400000000, IsActive = true, DisplayOrder = 3, CreatedAt = DateTime.UtcNow }
            };

            context.Causes.AddRange(causes);
            await context.SaveChangesAsync();

            // Add sub-causes for the three Care4Kids parent causes.
            // Only Care4Kids-aligned sub-causes are seeded — the original
            // Women Empowerment / Emergency Relief sub-causes are dropped
            // because their parents are no longer seeded.
            var educationCause = causes.First(c => c.CauseCode == "EDU");
            var healthCause = causes.First(c => c.CauseCode == "HEALTH");
            var childCause = causes.First(c => c.CauseCode == "CHILD");

            var subCauses = new List<Cause>
            {
                // Education sub-causes
                new Cause { CauseCode = "EDU-BOOK", CauseName = "School Supplies", Description = "Provide books, uniforms, and stationery", ParentCauseId = educationCause.CauseId, TargetAmount = 50000000, IsActive = true, DisplayOrder = 1, CreatedAt = DateTime.UtcNow },
                new Cause { CauseCode = "EDU-SCHOLAR", CauseName = "Scholarships", Description = "Fund educational scholarships", ParentCauseId = educationCause.CauseId, TargetAmount = 100000000, IsActive = true, DisplayOrder = 2, CreatedAt = DateTime.UtcNow },
                new Cause { CauseCode = "EDU-SKILL", CauseName = "Vocational Training", Description = "Skill development programs", ParentCauseId = educationCause.CauseId, TargetAmount = 75000000, IsActive = true, DisplayOrder = 3, CreatedAt = DateTime.UtcNow },
                // Healthcare sub-causes
                new Cause { CauseCode = "HEALTH-MED", CauseName = "Medical Treatment", Description = "Fund medical treatments and surgeries", ParentCauseId = healthCause.CauseId, TargetAmount = 200000000, IsActive = true, DisplayOrder = 1, CreatedAt = DateTime.UtcNow },
                new Cause { CauseCode = "HEALTH-VAC", CauseName = "Vaccination Programs", Description = "Support vaccination drives", ParentCauseId = healthCause.CauseId, TargetAmount = 100000000, IsActive = true, DisplayOrder = 2, CreatedAt = DateTime.UtcNow },
                new Cause { CauseCode = "HEALTH-MH", CauseName = "Mental Health", Description = "Mental health awareness and support", ParentCauseId = healthCause.CauseId, TargetAmount = 75000000, IsActive = true, DisplayOrder = 3, CreatedAt = DateTime.UtcNow },
                // Child Welfare sub-causes
                new Cause { CauseCode = "CHILD-SHELTER", CauseName = "Child Shelters", Description = "Safe houses for children", ParentCauseId = childCause.CauseId, TargetAmount = 100000000, IsActive = true, DisplayOrder = 1, CreatedAt = DateTime.UtcNow },
                new Cause { CauseCode = "CHILD-NUTR", CauseName = "Nutrition", Description = "Fight child malnutrition", ParentCauseId = childCause.CauseId, TargetAmount = 75000000, IsActive = true, DisplayOrder = 2, CreatedAt = DateTime.UtcNow }
            };

            context.Causes.AddRange(subCauses);
            await context.SaveChangesAsync();
    }

    private static async Task SeedCmsPagesAsync(GiveAIDDbContext context)
    {
        if (await context.CmsPages.AnyAsync()) return;

        var cmsPages = new List<CmsPage>
            {
                new CmsPage
                {
                    PageKey = "home",
                    PageSlug = "/",
                    PageTitle = "Home",
                    Content = "<h1>Welcome to GiveAID</h1><p>Making a difference together.</p>",
                    IsActive = true,
                    IsInMenu = true,
                    DisplayOrder = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new CmsPage
                {
                    PageKey = "about_us",
                    PageSlug = "about-us",
                    PageTitle = "About Us",
                    Content = "<h1>About GiveAID</h1><p>GiveAID is a platform connecting donors with meaningful causes.</p>",
                    MetaDescription = "Learn about GiveAID's mission and vision",
                    IsActive = true,
                    IsInMenu = true,
                    DisplayOrder = 2,
                    CreatedAt = DateTime.UtcNow
                },
                new CmsPage
                {
                    PageKey = "contact",
                    PageSlug = "contact",
                    PageTitle = "Contact Us",
                    Content = "<h1>Contact Us</h1><p>Get in touch with our team.</p>",
                    MetaDescription = "Contact GiveAID team",
                    IsActive = true,
                    IsInMenu = true,
                    DisplayOrder = 3,
                    CreatedAt = DateTime.UtcNow
                },
                new CmsPage
                {
                    PageKey = "privacy_policy",
                    PageSlug = "privacy-policy",
                    PageTitle = "Privacy Policy",
                    Content = "<h1>Privacy Policy</h1><p>Your privacy is important to us.</p>",
                    IsActive = true,
                    IsInMenu = false,
                    DisplayOrder = 0,
                    CreatedAt = DateTime.UtcNow
                },
                new CmsPage
                {
                    PageKey = "terms_of_service",
                    PageSlug = "terms-of-service",
                    PageTitle = "Terms of Service",
                    Content = "<h1>Terms of Service</h1><p>Please read our terms carefully.</p>",
                    IsActive = true,
                    IsInMenu = false,
                    DisplayOrder = 0,
                    CreatedAt = DateTime.UtcNow
                }
            };

            context.CmsPages.AddRange(cmsPages);
            await context.SaveChangesAsync();
    }

    private static async Task SeedFaqsAsync(GiveAIDDbContext context)
    {
        if (await context.Faqs.AnyAsync()) return;

        var faqs = new List<Faq>
            {
                new Faq { Question = "How do I make a donation?", Answer = "Simply browse our causes, select one you care about, and click 'Donate'. You can use credit card, debit card, or bank transfer.", Category = "Donations", DisplayOrder = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Faq { Question = "Is my donation tax-deductible?", Answer = "Yes, donations to registered charitable organizations may be tax-deductible. Please consult your tax advisor for specific advice.", Category = "Donations", DisplayOrder = 2, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Faq { Question = "How is my donation used?", Answer = "100% of your donation goes directly to the cause you choose. We maintain transparent reporting on all campaigns.", Category = "Donations", DisplayOrder = 3, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Faq { Question = "How do I volunteer?", Answer = "Register on our platform, browse volunteer opportunities, and sign up for programs that match your interests.", Category = "Volunteering", DisplayOrder = 1, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Faq { Question = "Can I cancel my recurring donation?", Answer = "Yes, you can cancel your recurring donation anytime from your account settings.", Category = "Donations", DisplayOrder = 4, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Faq { Question = "How do I receive a donation receipt?", Answer = "Donation receipts are automatically sent to your registered email address after each donation.", Category = "Donations", DisplayOrder = 5, IsActive = true, CreatedAt = DateTime.UtcNow }
            };

            context.Faqs.AddRange(faqs);
            await context.SaveChangesAsync();
    }

    /// <summary>
    /// Canonical partner / NGO list rendered on the public "Our Partners"
    /// page. Idempotent by <see cref="Organization.OrganizationName"/> —
    /// running it multiple times will not produce duplicate rows.
    /// </summary>

    /// <summary>
    /// Seed Gallery items if empty. The Gallery page reads from this
    /// table; without rows the public page shows the empty state.
    ///
    /// Data source: <c>assets\images\ảnh gallery\NGO_Gallery_Titles*.docx</c>
    /// (64 photo titles — 4 batches). Photo URLs point to the static
    /// <c>/images/gallery/Gxxx.ext</c> files served by the React app's
    /// <c>public/</c> folder. Categories are derived from the photo
    /// subject so admins can filter the public gallery.
    /// </summary>
    private static async Task SeedGalleryAsync(GiveAIDDbContext context)
    {
        if (await context.Gallery.AnyAsync()) return;

        // Single base URL for all gallery photos — the React app serves
        // files in public/ from the site root, so /images/gallery/G001.jpg
        // resolves in both dev (CRA dev server) and prod (after build).
        const string baseUrl = "/images/gallery/";
        var now = DateTime.UtcNow;

        var gallery = new List<Gallery>
        {
            // ── Batch 1 (1–20): Highlands & everyday moments ──
            new Gallery { Title = "Growing Up in the Highlands", PhotoUrl = baseUrl + "G001.jpg", Category = "portraits", DisplayOrder = 1,  IsFeatured = true,  UploadedAt = now.AddDays(-30) },
            new Gallery { Title = "Sharing Small Joys",          PhotoUrl = baseUrl + "G002.jpg", Category = "portraits", DisplayOrder = 2,  IsFeatured = false, UploadedAt = now.AddDays(-29) },
            new Gallery { Title = "A Splash of Joy",             PhotoUrl = baseUrl + "G003.jpg", Category = "portraits", DisplayOrder = 3,  IsFeatured = true,  UploadedAt = now.AddDays(-28) },
            new Gallery { Title = "Curious Eyes, Bright Future", PhotoUrl = baseUrl + "G004.jpg", Category = "education", DisplayOrder = 4,  IsFeatured = false, UploadedAt = now.AddDays(-27) },
            new Gallery { Title = "Swinging Toward Hope",        PhotoUrl = baseUrl + "G005.jpg", Category = "community", DisplayOrder = 5,  IsFeatured = false, UploadedAt = now.AddDays(-26) },
            new Gallery { Title = "A Smile Worth Protecting",    PhotoUrl = baseUrl + "G006.jpg", Category = "portraits", DisplayOrder = 6,  IsFeatured = false, UploadedAt = now.AddDays(-25) },
            new Gallery { Title = "Eager to Learn",              PhotoUrl = baseUrl + "G007.jpg", Category = "education", DisplayOrder = 7,  IsFeatured = true,  UploadedAt = now.AddDays(-24) },
            new Gallery { Title = "Warm Hearts, Cold Hills",     PhotoUrl = baseUrl + "G008.jpg", Category = "relief",    DisplayOrder = 8,  IsFeatured = false, UploadedAt = now.AddDays(-23) },
            new Gallery { Title = "Building Their Future",       PhotoUrl = baseUrl + "G009.jpg", Category = "education", DisplayOrder = 9,  IsFeatured = false, UploadedAt = now.AddDays(-22) },
            new Gallery { Title = "Hope in Their Hands",         PhotoUrl = baseUrl + "G010.jpg", Category = "community", DisplayOrder = 10, IsFeatured = false, UploadedAt = now.AddDays(-21) },
            new Gallery { Title = "A Meal Means the World",      PhotoUrl = baseUrl + "G011.png", Category = "health",    DisplayOrder = 11, IsFeatured = true,  UploadedAt = now.AddDays(-20) },
            new Gallery { Title = "Carrying Hope Uphill",        PhotoUrl = baseUrl + "G012.jpg", Category = "community", DisplayOrder = 12, IsFeatured = false, UploadedAt = now.AddDays(-19) },
            new Gallery { Title = "Secret Giggles",              PhotoUrl = baseUrl + "G013.jpg", Category = "portraits", DisplayOrder = 13, IsFeatured = false, UploadedAt = now.AddDays(-18) },
            new Gallery { Title = "Hand in Hand",                PhotoUrl = baseUrl + "G014.jpg", Category = "community", DisplayOrder = 14, IsFeatured = true,  UploadedAt = now.AddDays(-17) },
            new Gallery { Title = "Hello from the Mountains",    PhotoUrl = baseUrl + "G015.jpg", Category = "portraits", DisplayOrder = 15, IsFeatured = false, UploadedAt = now.AddDays(-16) },
            new Gallery { Title = "Dreaming Above the Terraces", PhotoUrl = baseUrl + "G016.jpg", Category = "portraits", DisplayOrder = 16, IsFeatured = false, UploadedAt = now.AddDays(-15) },
            new Gallery { Title = "Shy Smile, Big Dreams",       PhotoUrl = baseUrl + "G017.jpg", Category = "portraits", DisplayOrder = 17, IsFeatured = false, UploadedAt = now.AddDays(-14) },
            new Gallery { Title = "Peeking at Tomorrow",         PhotoUrl = baseUrl + "G018.jpg", Category = "portraits", DisplayOrder = 18, IsFeatured = false, UploadedAt = now.AddDays(-13) },
            new Gallery { Title = "Never Letting Go",            PhotoUrl = baseUrl + "G019.jpg", Category = "community", DisplayOrder = 19, IsFeatured = false, UploadedAt = now.AddDays(-12) },
            new Gallery { Title = "Looking Toward Tomorrow",     PhotoUrl = baseUrl + "G020.jpg", Category = "portraits", DisplayOrder = 20, IsFeatured = true,  UploadedAt = now.AddDays(-11) },

            // ── Batch 2 (21–40): Cold season & resilience ──
            new Gallery { Title = "Held Close",                  PhotoUrl = baseUrl + "G021.jpg", Category = "portraits", DisplayOrder = 21, IsFeatured = false, UploadedAt = now.AddDays(-10) },
            new Gallery { Title = "Resting, Still Hoping",       PhotoUrl = baseUrl + "G022.jpg", Category = "portraits", DisplayOrder = 22, IsFeatured = false, UploadedAt = now.AddDays(-10) },
            new Gallery { Title = "A Cold Morning Wait",         PhotoUrl = baseUrl + "G023.jpg", Category = "relief",    DisplayOrder = 23, IsFeatured = false, UploadedAt = now.AddDays(-9)  },
            new Gallery { Title = "Barefoot in the Cold",        PhotoUrl = baseUrl + "G024.jpg", Category = "relief",    DisplayOrder = 24, IsFeatured = true,  UploadedAt = now.AddDays(-9)  },
            new Gallery { Title = "Standing Together",           PhotoUrl = baseUrl + "G025.jpg", Category = "community", DisplayOrder = 25, IsFeatured = false, UploadedAt = now.AddDays(-9)  },
            new Gallery { Title = "Learning Against the Odds",   PhotoUrl = baseUrl + "G026.jpg", Category = "education", DisplayOrder = 26, IsFeatured = false, UploadedAt = now.AddDays(-8)  },
            new Gallery { Title = "Room to Grow",                PhotoUrl = baseUrl + "G027.jpg", Category = "education", DisplayOrder = 27, IsFeatured = false, UploadedAt = now.AddDays(-8)  },
            new Gallery { Title = "Whispered Wishes",            PhotoUrl = baseUrl + "G028.jpg", Category = "portraits", DisplayOrder = 28, IsFeatured = false, UploadedAt = now.AddDays(-8)  },
            new Gallery { Title = "Growing Up Too Fast",         PhotoUrl = baseUrl + "G029.jpg", Category = "portraits", DisplayOrder = 29, IsFeatured = false, UploadedAt = now.AddDays(-7)  },
            new Gallery { Title = "Every Bowl Counts",           PhotoUrl = baseUrl + "G030.jpg", Category = "health",    DisplayOrder = 30, IsFeatured = true,  UploadedAt = now.AddDays(-7)  },
            new Gallery { Title = "Carried with Love",           PhotoUrl = baseUrl + "G031.jpg", Category = "community", DisplayOrder = 31, IsFeatured = false, UploadedAt = now.AddDays(-7)  },
            new Gallery { Title = "Small Hands at Work",         PhotoUrl = baseUrl + "G032.jpg", Category = "community", DisplayOrder = 32, IsFeatured = false, UploadedAt = now.AddDays(-6)  },
            new Gallery { Title = "Walking Her Own Way",         PhotoUrl = baseUrl + "G033.jpg", Category = "portraits", DisplayOrder = 33, IsFeatured = false, UploadedAt = now.AddDays(-6)  },
            new Gallery { Title = "A Sweet Little Moment",       PhotoUrl = baseUrl + "G034.jpg", Category = "portraits", DisplayOrder = 34, IsFeatured = false, UploadedAt = now.AddDays(-6)  },
            new Gallery { Title = "A Quiet Smile",               PhotoUrl = baseUrl + "G035.jpg", Category = "portraits", DisplayOrder = 35, IsFeatured = false, UploadedAt = now.AddDays(-5)  },
            new Gallery { Title = "Little Explorer",             PhotoUrl = baseUrl + "G036.jpg", Category = "community", DisplayOrder = 36, IsFeatured = false, UploadedAt = now.AddDays(-5)  },
            new Gallery { Title = "Wide-Eyed Wonder",            PhotoUrl = baseUrl + "G037.jpg", Category = "portraits", DisplayOrder = 37, IsFeatured = false, UploadedAt = now.AddDays(-5)  },
            new Gallery { Title = "Every Tear Matters",          PhotoUrl = baseUrl + "G038.jpg", Category = "relief",    DisplayOrder = 38, IsFeatured = false, UploadedAt = now.AddDays(-4)  },
            new Gallery { Title = "Brighter Days Ahead",         PhotoUrl = baseUrl + "G039.jpg", Category = "portraits", DisplayOrder = 39, IsFeatured = true,  UploadedAt = now.AddDays(-4)  },
            new Gallery { Title = "Laughing Together",           PhotoUrl = baseUrl + "G040.jpg", Category = "community", DisplayOrder = 40, IsFeatured = false, UploadedAt = now.AddDays(-4)  },

            // ── Batch 3 (41–60): Family, farm, friendship ──
            // (Batch 3 has no #56; numbering continues from 55 to 57.)
            new Gallery { Title = "Gentle Strength",             PhotoUrl = baseUrl + "G041.jpg", Category = "portraits", DisplayOrder = 41, IsFeatured = false, UploadedAt = now.AddDays(-3)  },
            new Gallery { Title = "Little Ones, Big Needs",      PhotoUrl = baseUrl + "G042.jpg", Category = "relief",    DisplayOrder = 42, IsFeatured = false, UploadedAt = now.AddDays(-3)  },
            new Gallery { Title = "Warmth Shared",               PhotoUrl = baseUrl + "G043.jpg", Category = "community", DisplayOrder = 43, IsFeatured = false, UploadedAt = now.AddDays(-3)  },
            new Gallery { Title = "Side by Side",                PhotoUrl = baseUrl + "G044.jpg", Category = "community", DisplayOrder = 44, IsFeatured = true,  UploadedAt = now.AddDays(-3)  },
            new Gallery { Title = "Wildflower Laughter",         PhotoUrl = baseUrl + "G045.jpg", Category = "portraits", DisplayOrder = 45, IsFeatured = false, UploadedAt = now.AddDays(-2)  },
            new Gallery { Title = "Golden Steps Together",       PhotoUrl = baseUrl + "G046.jpg", Category = "community", DisplayOrder = 46, IsFeatured = false, UploadedAt = now.AddDays(-2)  },
            new Gallery { Title = "A Gift in Small Hands",       PhotoUrl = baseUrl + "G047.jpg", Category = "community", DisplayOrder = 47, IsFeatured = false, UploadedAt = now.AddDays(-2)  },
            new Gallery { Title = "Waiting Quietly",             PhotoUrl = baseUrl + "G048.jpg", Category = "portraits", DisplayOrder = 48, IsFeatured = false, UploadedAt = now.AddDays(-2)  },
            new Gallery { Title = "Sleeping Safe on Her Back",   PhotoUrl = baseUrl + "G049.jpg", Category = "portraits", DisplayOrder = 49, IsFeatured = true,  UploadedAt = now.AddDays(-1)  },
            new Gallery { Title = "Running Through the Mist",    PhotoUrl = baseUrl + "G050.jpg", Category = "community", DisplayOrder = 50, IsFeatured = false, UploadedAt = now.AddDays(-1)  },
            new Gallery { Title = "Rosy Cheeks, Big Smile",      PhotoUrl = baseUrl + "G051.png", Category = "portraits", DisplayOrder = 51, IsFeatured = false, UploadedAt = now.AddDays(-1)  },
            new Gallery { Title = "Little Guardians",            PhotoUrl = baseUrl + "G052.jpg", Category = "community", DisplayOrder = 52, IsFeatured = false, UploadedAt = now.AddDays(-1)  },
            new Gallery { Title = "Innocent Eyes",               PhotoUrl = baseUrl + "G053.jpg", Category = "portraits", DisplayOrder = 53, IsFeatured = true,  UploadedAt = now.AddDays(-1)  },
            new Gallery { Title = "Little Farmhands",            PhotoUrl = baseUrl + "G054.jpg", Category = "community", DisplayOrder = 54, IsFeatured = false, UploadedAt = now.AddHours(-20) },
            new Gallery { Title = "Play Finds a Way",            PhotoUrl = baseUrl + "G055.jpg", Category = "community", DisplayOrder = 55, IsFeatured = false, UploadedAt = now.AddHours(-18) },
            new Gallery { Title = "Comfort in Friendship",       PhotoUrl = baseUrl + "G057.jpg", Category = "community", DisplayOrder = 57, IsFeatured = false, UploadedAt = now.AddHours(-16) },
            new Gallery { Title = "Small Feet, Cold Ground",     PhotoUrl = baseUrl + "G058.jpg", Category = "relief",    DisplayOrder = 58, IsFeatured = false, UploadedAt = now.AddHours(-14) },
            new Gallery { Title = "Joy in Bloom",                PhotoUrl = baseUrl + "G059.jpg", Category = "community", DisplayOrder = 59, IsFeatured = true,  UploadedAt = now.AddHours(-12) },
            new Gallery { Title = "Small Backs, Big Loads",      PhotoUrl = baseUrl + "G060.jpg", Category = "community", DisplayOrder = 60, IsFeatured = false, UploadedAt = now.AddHours(-10) },

            // ── Batch 4 (61–64): School & nutrition ──
            new Gallery { Title = "A Classroom of Dreams",       PhotoUrl = baseUrl + "G061.jpg", Category = "education", DisplayOrder = 61, IsFeatured = true,  UploadedAt = now.AddHours(-8)  },
            new Gallery { Title = "Plain Rice, Grateful Hearts", PhotoUrl = baseUrl + "G062.jpg", Category = "health",    DisplayOrder = 62, IsFeatured = false, UploadedAt = now.AddHours(-6)  },
            new Gallery { Title = "A Humble Schoolhouse",        PhotoUrl = baseUrl + "G063.jpg", Category = "education", DisplayOrder = 63, IsFeatured = false, UploadedAt = now.AddHours(-4)  },
            new Gallery { Title = "Waiting for Lunch",           PhotoUrl = baseUrl + "G064.jpg", Category = "health",    DisplayOrder = 64, IsFeatured = false, UploadedAt = now.AddHours(-2)  }
        };

        context.Gallery.AddRange(gallery);
        await context.SaveChangesAsync();
    }

    /// <summary>Seed Achievements if empty (MAJ-001).</summary>
    private static async Task SeedAchievementsAsync(GiveAIDDbContext context)
    {
        if (await context.Achievements.AnyAsync()) return;

        var achievements = new List<Achievement>
            {
                new Achievement
                {
                    Title = "50,000 Children Fed in 2024",
                    Category = "Nutrition",
                    Description = "A landmark milestone — served 50,000 nutritious meals to children across 12 provinces in Vietnam through our Bữa Cơm Có Thịt programme.",
                    MetricValue = 50000,
                    MetricLabel = "Children",
                    MetricSuffix = "",
                    AchievementDate = new DateTime(2024, 12, 31),
                    ImageUrl = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=80",
                    Icon = "utensils",
                    AwardBy = "Ministry of Labour",
                    Location = "Vietnam",
                    Beneficiaries = 50000,
                    DisplayOrder = 1,
                    IsActive = true,
                    IsFeatured = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Achievement
                {
                    Title = "1,200 Heart Surgeries Funded",
                    Category = "Healthcare",
                    Description = "Funded over 1,200 life-saving pediatric heart surgeries since 2018, partnering with National Cardiac Hospital.",
                    MetricValue = 1200,
                    MetricLabel = "Surgeries",
                    MetricSuffix = "",
                    AchievementDate = new DateTime(2025, 6, 15),
                    ImageUrl = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
                    Icon = "heartbeat",
                    AwardBy = "National Cardiac Hospital",
                    Location = "Hanoi, Vietnam",
                    Beneficiaries = 1200,
                    DisplayOrder = 2,
                    IsActive = true,
                    IsFeatured = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Achievement
                {
                    Title = "100 Schools Received Library Grants",
                    Category = "Education",
                    Description = "Provided library grants to 100 rural schools across 15 provinces, supplying books, shelving and reading programmes.",
                    MetricValue = 100,
                    MetricLabel = "Schools",
                    MetricSuffix = "",
                    AchievementDate = new DateTime(2025, 3, 1),
                    ImageUrl = "https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=900&q=80",
                    Icon = "book",
                    AwardBy = "Ministry of Education",
                    Location = "Northern Vietnam",
                    Beneficiaries = 150000,
                    DisplayOrder = 3,
                    IsActive = true,
                    IsFeatured = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Achievement
                {
                    Title = "VND 25 Billion Raised for Flood Relief 2024",
                    Category = "Emergency",
                    Description = "Emergency fundraising campaign for central Vietnam floods — reached VND 25 billion in 30 days from 18,000 donors.",
                    MetricValue = 25_000_000_000,
                    MetricLabel = "VND Raised",
                    MetricSuffix = "",
                    AchievementDate = new DateTime(2024, 11, 15),
                    ImageUrl = "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=900&q=80",
                    Icon = "water",
                    AwardBy = "Vietnam Red Cross",
                    Location = "Central Vietnam",
                    Beneficiaries = 85000,
                    DisplayOrder = 4,
                    IsActive = true,
                    IsFeatured = false,
                    CreatedAt = DateTime.UtcNow
                },
                new Achievement
                {
                    Title = "UNICEF Partner of the Year 2024",
                    Category = "Partnership",
                    Description = "Awarded UNICEF Partner of the Year for outstanding contribution to child welfare programmes in Southeast Asia.",
                    MetricValue = 1,
                    MetricLabel = "Award",
                    MetricSuffix = "",
                    AchievementDate = new DateTime(2024, 10, 1),
                    ImageUrl = "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=900&q=80",
                    Icon = "award",
                    AwardBy = "UNICEF SEAP",
                    Location = "Bangkok, Thailand",
                    Beneficiaries = 0,
                    DisplayOrder = 5,
                    IsActive = true,
                    IsFeatured = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Achievement
                {
                    Title = "10,000 Volunteer Hours Logged",
                    Category = "Community",
                    Description = "Community volunteers contributed over 10,000 hours to teaching, outreach and disaster response activities in 2024.",
                    MetricValue = 10000,
                    MetricLabel = "Volunteer Hours",
                    MetricSuffix = "",
                    AchievementDate = new DateTime(2024, 12, 31),
                    ImageUrl = "https://images.unsplash.com/photo-1559027612-cfa6a79a7c91?auto=format&fit=crop&w=900&q=80",
                    Icon = "users",
                    AwardBy = "Internal Recognition",
                    Location = "Nationwide",
                    Beneficiaries = 0,
                    DisplayOrder = 6,
                    IsActive = true,
                    IsFeatured = false,
                    CreatedAt = DateTime.UtcNow
                },
                new Achievement
                {
                    Title = "3 New Care Homes Opened",
                    Category = "Shelter",
                    Description = "Opened three new long-term residential care homes in Hanoi, Da Nang and Can Tho, providing safe homes for 150 orphaned children.",
                    MetricValue = 3,
                    MetricLabel = "Care Homes",
                    MetricSuffix = "",
                    AchievementDate = new DateTime(2025, 1, 15),
                    ImageUrl = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
                    Icon = "home",
                    AwardBy = "Ministry of Labour",
                    Location = "Hanoi, Da Nang, Can Tho",
                    Beneficiaries = 150,
                    DisplayOrder = 7,
                    IsActive = true,
                    IsFeatured = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Achievement
                {
                    Title = "VND 50 Billion in Total Donations Received",
                    Category = "Fundraising",
                    Description = "Cumulative total donations received since platform launch exceeded VND 50 billion — a testament to donor trust.",
                    MetricValue = 50_000_000_000,
                    MetricLabel = "VND Total Raised",
                    MetricSuffix = "",
                    AchievementDate = new DateTime(2025, 4, 1),
                    ImageUrl = "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=900&q=80",
                    Icon = "coins",
                    AwardBy = "Internal Milestone",
                    Location = "Platform-wide",
                    Beneficiaries = 0,
                    DisplayOrder = 8,
                    IsActive = true,
                    IsFeatured = false,
                    CreatedAt = DateTime.UtcNow
                }
            };
            context.Achievements.AddRange(achievements);
            await context.SaveChangesAsync();
    }

    /// <summary>Seed TeamMembers if empty (MAJ-002).</summary>
    private static async Task SeedTeamMembersAsync(GiveAIDDbContext context)
    {
        if (await context.TeamMembers.AnyAsync()) return;

        var teamMembers = new List<TeamMember>
            {
                new TeamMember
                {
                    FullName = "Nguyen Van Minh",
                    RoleTitle = "Executive Director",
                    Department = "Leadership",
                    Bio = "Minh has led GiveAID since 2015, growing it from a small local charity to Vietnam's most trusted child welfare platform. With 20 years in NGO management, he oversees all programmes and partnerships.",
                    PhotoUrl = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
                    Email = "minh.nv@give-aid.org",
                    LinkedInUrl = "https://linkedin.com/in/minh-nguyen",
                    IsActive = true,
                    IsFeatured = true,
                    JoinedDate = new DateTime(2015, 1, 1),
                    DisplayOrder = 1,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new TeamMember
                {
                    FullName = "Tran Thi Lan",
                    RoleTitle = "Programmes Director",
                    Department = "Programmes",
                    Bio = "Lan oversees all field programmes including education, healthcare and emergency response. She holds an MBA from Fulbright University Vietnam and previously worked with UNICEF Vietnam.",
                    PhotoUrl = "https://images.unsplash.com/photo-1494790108755-2616b612b193?auto=format&fit=crop&w=400&q=80",
                    Email = "lan.tt@give-aid.org",
                    LinkedInUrl = "https://linkedin.com/in/lan-tran",
                    IsActive = true,
                    IsFeatured = true,
                    JoinedDate = new DateTime(2017, 6, 1),
                    DisplayOrder = 2,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new TeamMember
                {
                    FullName = "John Anderson",
                    RoleTitle = "Chief Technology Officer",
                    Department = "Technology",
                    Bio = "John built the GiveAID platform from the ground up, ensuring transparency in donation tracking and real-time impact reporting. He has 15 years of experience in fintech and nonprofit tech.",
                    PhotoUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
                    Email = "john.a@give-aid.org",
                    LinkedInUrl = "https://linkedin.com/in/johnanderson",
                    TwitterUrl = "https://twitter.com/johnanderson",
                    IsActive = true,
                    IsFeatured = true,
                    JoinedDate = new DateTime(2018, 3, 1),
                    DisplayOrder = 3,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new TeamMember
                {
                    FullName = "Pham Thi Mai",
                    RoleTitle = "Head of Fundraising",
                    Department = "Fundraising",
                    Bio = "Mai leads all fundraising initiatives including corporate partnerships, individual donor programmes and grant applications. She has raised over VND 80 billion for charitable causes.",
                    PhotoUrl = "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
                    Email = "mai.pt@give-aid.org",
                    LinkedInUrl = "https://linkedin.com/in/maipham",
                    IsActive = true,
                    IsFeatured = false,
                    JoinedDate = new DateTime(2019, 9, 1),
                    DisplayOrder = 4,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new TeamMember
                {
                    FullName = "Le Van Hai",
                    RoleTitle = "Field Operations Manager",
                    Department = "Operations",
                    Bio = "Hai coordinates all on-the-ground operations across 12 provinces, managing a team of 45 field staff and 200+ volunteers. He ensures programmes reach beneficiaries efficiently.",
                    PhotoUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
                    Email = "hai.lv@give-aid.org",
                    IsActive = true,
                    IsFeatured = false,
                    JoinedDate = new DateTime(2016, 4, 1),
                    DisplayOrder = 5,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new TeamMember
                {
                    FullName = "Nguyen Thi Thu Ha",
                    RoleTitle = "Communications Manager",
                    Department = "Communications",
                    Bio = "Thu Ha manages all media, storytelling and digital communications. She has grown GiveAID's social following to 500,000+ and leads our donor engagement campaigns.",
                    PhotoUrl = "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80",
                    Email = "hantt@give-aid.org",
                    LinkedInUrl = "https://linkedin.com/in/thuha-nguyen",
                    TwitterUrl = "https://twitter.com/thuhan",
                    IsActive = true,
                    IsFeatured = false,
                    JoinedDate = new DateTime(2020, 2, 1),
                    DisplayOrder = 6,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new TeamMember
                {
                    FullName = "David Smith",
                    RoleTitle = "Finance & Compliance Director",
                    Department = "Finance",
                    Bio = "David oversees all financial operations, donor fund management and regulatory compliance. He is a CPA with 12 years of experience in nonprofit finance.",
                    PhotoUrl = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
                    Email = "david.s@give-aid.org",
                    LinkedInUrl = "https://linkedin.com/in/davidsmith",
                    IsActive = true,
                    IsFeatured = false,
                    JoinedDate = new DateTime(2019, 11, 1),
                    DisplayOrder = 7,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new TeamMember
                {
                    FullName = "Vo Thi Kim Lien",
                    RoleTitle = "HR & Volunteer Coordinator",
                    Department = "Human Resources",
                    Bio = "Kim Lien manages staff recruitment, volunteer programmes and capacity building. She has onboarded over 500 volunteers and built GiveAID's strong culture of compassion.",
                    PhotoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
                    Email = "lien.vt@give-aid.org",
                    IsActive = true,
                    IsFeatured = false,
                    JoinedDate = new DateTime(2021, 5, 1),
                    DisplayOrder = 8,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                }
            };
            context.TeamMembers.AddRange(teamMembers);
            await context.SaveChangesAsync();
    }

    /// <summary>Seed Careers if empty (MAJ-003).</summary>
    private static async Task SeedCareersAsync(GiveAIDDbContext context)
    {
        if (await context.Careers.AnyAsync()) return;

        var careers = new List<Career>
            {
                new Career
                {
                    PositionTitle = "Senior Programme Officer",
                    Department = "Programmes",
                    Description = "Lead the design, implementation and monitoring of child welfare programmes across Vietnam. You will work with field teams, partners and donors to ensure maximum impact.",
                    Requirements = "• 5+ years in programme management in an NGO setting\n• Bachelor's or Master's degree in Social Work, Development Studies or related field\n• Fluent in Vietnamese and English\n• Experience with M&E frameworks and donor reporting\n• Strong analytical and writing skills",
                    Responsibilities = "• Design and manage child welfare programmes\n• Coordinate with field teams and partner organisations\n• Prepare donor reports and programme documentation\n• Monitor and evaluate programme outcomes\n• Represent GiveAID at cluster meetings and workshops",
                    Location = "Hanoi, Vietnam",
                    EmploymentType = "Full-time",
                    SalaryRange = "VND 25,000,000 – 35,000,000/month",
                    Vacancies = 2,
                    PostedDate = DateTime.UtcNow.AddDays(-14),
                    ClosingDate = DateTime.UtcNow.AddDays(30),
                    IsActive = true,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new Career
                {
                    PositionTitle = "Frontend Developer (React)",
                    Department = "Technology",
                    Description = "Join our tech team to build beautiful, accessible and performant React interfaces for our donor and admin platforms. You will work closely with designers and the backend team.",
                    Requirements = "• 3+ years of professional React development\n• Strong proficiency in JavaScript/TypeScript, HTML, CSS\n• Experience with React Bootstrap, Redux or Zustand\n• Understanding of accessibility (WCAG 2.1) and responsive design\n• Experience with REST API integration",
                    Responsibilities = "• Build and maintain React components for donor and admin portals\n• Optimise UI performance and responsiveness\n• Collaborate with UX designers on new features\n• Write unit and integration tests\n• Participate in code reviews and technical design",
                    Location = "Remote (Vietnam)",
                    EmploymentType = "Full-time",
                    SalaryRange = "VND 20,000,000 – 30,000,000/month",
                    Vacancies = 1,
                    PostedDate = DateTime.UtcNow.AddDays(-7),
                    ClosingDate = DateTime.UtcNow.AddDays(28),
                    IsActive = true,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new Career
                {
                    PositionTitle = "Communications & Storytelling Officer",
                    Department = "Communications",
                    Description = "Help us tell the stories that move donors to act. You will produce written content, manage social media, and coordinate with our photography and video team to showcase real impact.",
                    Requirements = "• 3+ years in communications, journalism or content marketing\n• Excellent writing skills in Vietnamese and English\n• Experience with social media management (Facebook, Instagram, LinkedIn)\n• Basic photo/video editing skills\n• Passion for humanitarian storytelling with ethics",
                    Responsibilities = "• Write impact stories, donor spotlights and newsletter content\n• Manage social media calendars and community engagement\n• Coordinate with photographers and field staff for content\n• Support fundraising campaign communications\n• Track and report on communications KPIs",
                    Location = "Ho Chi Minh City, Vietnam",
                    EmploymentType = "Full-time",
                    SalaryRange = "VND 15,000,000 – 22,000,000/month",
                    Vacancies = 1,
                    PostedDate = DateTime.UtcNow.AddDays(-21),
                    ClosingDate = DateTime.UtcNow.AddDays(14),
                    IsActive = true,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                },
                new Career
                {
                    PositionTitle = "Volunteer Coordinator (Part-time)",
                    Department = "Human Resources",
                    Description = "Recruit, onboard and manage our volunteer community. You will organise volunteer events, training sessions and recognition programmes.",
                    Requirements = "• 2+ years in volunteer management or HR\n• Strong organisational and interpersonal skills\n• Ability to work evenings and weekends for volunteer events\n• Vietnamese and English proficiency\n• Experience with volunteer management software preferred",
                    Responsibilities = "• Recruit and screen new volunteers\n• Organise volunteer orientation and training\n• Coordinate volunteer schedules for events\n• Maintain volunteer database and records\n• Recognise and retain top volunteers",
                    Location = "Hanoi, Vietnam",
                    EmploymentType = "Part-time",
                    SalaryRange = "VND 10,000,000 – 14,000,000/month",
                    Vacancies = 1,
                    PostedDate = DateTime.UtcNow.AddDays(-5),
                    ClosingDate = DateTime.UtcNow.AddDays(25),
                    IsActive = true,
                    CreatedBy = 1,
                    CreatedAt = DateTime.UtcNow
                }
            };
            context.Careers.AddRange(careers);
            await context.SaveChangesAsync();
    }

    /// <summary>Seed Donations if empty (MAJ-004).</summary>
    private static async Task SeedDonationsAsync(GiveAIDDbContext context)
    {
        if (await context.Donations.AnyAsync()) return;

        var donationAdminUser = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                .FirstOrDefaultAsync(context.Users, u => u.Username == "admin");
            var donationDemoUser = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                .FirstOrDefaultAsync(context.Users, u => u.Username == "demo");

            var causes = await context.Causes.Take(6).ToListAsync();
            var campaigns = await context.Campaigns.Take(4).ToListAsync();

            var today = DateTime.UtcNow;
            var donations = new List<Donation>
            {
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(0)?.CauseId ?? 1, CampaignId = campaigns.ElementAtOrDefault(0)?.CampaignId, Amount = 500000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", TransactionId = "TXN-001-001", Message = "Keep up the great work!", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-60), PaymentConfirmedAt = today.AddDays(-60), CreatedAt = today.AddDays(-60) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(1)?.CauseId ?? 2, CampaignId = campaigns.ElementAtOrDefault(1)?.CampaignId, Amount = 200000, PaymentMethod = "DebitCard", PaymentStatus = "Completed", TransactionId = "TXN-001-002", IsAnonymous = true, ReceiptSent = true, DonationDate = today.AddDays(-58), PaymentConfirmedAt = today.AddDays(-58), CreatedAt = today.AddDays(-58) },
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(2)?.CauseId ?? 3, CampaignId = campaigns.ElementAtOrDefault(2)?.CampaignId, Amount = 1000000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "4242", CardType = "Visa", TransactionId = "TXN-001-003", Message = "For the children!", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-55), PaymentConfirmedAt = today.AddDays(-55), CreatedAt = today.AddDays(-55) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(0)?.CauseId ?? 1, Amount = 100000, PaymentMethod = "NetBanking", PaymentStatus = "Completed", TransactionId = "TXN-001-004", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-50), PaymentConfirmedAt = today.AddDays(-50), CreatedAt = today.AddDays(-50) },
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(3)?.CauseId ?? 4, CampaignId = campaigns.ElementAtOrDefault(3)?.CampaignId, Amount = 2000000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "1234", CardType = "Mastercard", TransactionId = "TXN-001-005", Message = "A monthly gift to support your mission", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-45), PaymentConfirmedAt = today.AddDays(-45), CreatedAt = today.AddDays(-45) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(1)?.CauseId ?? 2, Amount = 300000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "5678", CardType = "Visa", TransactionId = "TXN-001-006", IsAnonymous = true, ReceiptSent = true, DonationDate = today.AddDays(-40), PaymentConfirmedAt = today.AddDays(-40), CreatedAt = today.AddDays(-40) },
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(4)?.CauseId ?? 5, CampaignId = campaigns.ElementAtOrDefault(0)?.CampaignId, Amount = 500000, PaymentMethod = "DebitCard", PaymentStatus = "Completed", TransactionId = "TXN-001-007", Message = "Happy to support!", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-35), PaymentConfirmedAt = today.AddDays(-35), CreatedAt = today.AddDays(-35) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(2)?.CauseId ?? 3, Amount = 750000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "9012", CardType = "Visa", TransactionId = "TXN-001-008", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-30), PaymentConfirmedAt = today.AddDays(-30), CreatedAt = today.AddDays(-30) },
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(0)?.CauseId ?? 1, CampaignId = campaigns.ElementAtOrDefault(1)?.CampaignId, Amount = 1500000, PaymentMethod = "NetBanking", PaymentStatus = "Completed", TransactionId = "TXN-001-009", Message = "Urgent relief needed!", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-25), PaymentConfirmedAt = today.AddDays(-25), CreatedAt = today.AddDays(-25) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(3)?.CauseId ?? 4, Amount = 400000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "3456", CardType = "Mastercard", TransactionId = "TXN-001-010", IsAnonymous = true, ReceiptSent = true, DonationDate = today.AddDays(-20), PaymentConfirmedAt = today.AddDays(-20), CreatedAt = today.AddDays(-20) },
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(5)?.CauseId ?? 6, CampaignId = campaigns.ElementAtOrDefault(2)?.CampaignId, Amount = 3000000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "7890", CardType = "Visa", TransactionId = "TXN-001-011", Message = "For the children in flood-affected areas", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-15), PaymentConfirmedAt = today.AddDays(-15), CreatedAt = today.AddDays(-15) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(1)?.CauseId ?? 2, Amount = 200000, PaymentMethod = "DebitCard", PaymentStatus = "Completed", TransactionId = "TXN-001-012", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-12), PaymentConfirmedAt = today.AddDays(-12), CreatedAt = today.AddDays(-12) },
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(2)?.CauseId ?? 3, CampaignId = campaigns.ElementAtOrDefault(3)?.CampaignId, Amount = 1000000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "2468", CardType = "Visa", TransactionId = "TXN-001-013", Message = "Supporting education for all children", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-10), PaymentConfirmedAt = today.AddDays(-10), CreatedAt = today.AddDays(-10) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(0)?.CauseId ?? 1, Amount = 250000, PaymentMethod = "NetBanking", PaymentStatus = "Completed", TransactionId = "TXN-001-014", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-7), PaymentConfirmedAt = today.AddDays(-7), CreatedAt = today.AddDays(-7) },
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(4)?.CauseId ?? 5, CampaignId = campaigns.ElementAtOrDefault(0)?.CampaignId, Amount = 2000000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "1357", CardType = "Mastercard", TransactionId = "TXN-001-015", Message = "Monthly donation", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-5), PaymentConfirmedAt = today.AddDays(-5), CreatedAt = today.AddDays(-5) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(3)?.CauseId ?? 4, Amount = 600000, PaymentMethod = "CreditCard", PaymentStatus = "Completed", CardLastFour = "8021", CardType = "Visa", TransactionId = "TXN-001-016", IsAnonymous = true, ReceiptSent = true, DonationDate = today.AddDays(-3), PaymentConfirmedAt = today.AddDays(-3), CreatedAt = today.AddDays(-3) },
                new Donation { UserId = donationAdminUser?.UserId ?? 1, CauseId = causes.ElementAtOrDefault(1)?.CauseId ?? 2, CampaignId = campaigns.ElementAtOrDefault(2)?.CampaignId, Amount = 5000000, PaymentMethod = "NetBanking", PaymentStatus = "Completed", TransactionId = "TXN-001-017", Message = "From our family to yours", IsAnonymous = false, ReceiptSent = true, DonationDate = today.AddDays(-1), PaymentConfirmedAt = today.AddDays(-1), CreatedAt = today.AddDays(-1) },
                new Donation { UserId = donationDemoUser?.UserId ?? 2, CauseId = causes.ElementAtOrDefault(5)?.CauseId ?? 6, Amount = 150000, PaymentMethod = "DebitCard", PaymentStatus = "Completed", TransactionId = "TXN-001-018", IsAnonymous = false, ReceiptSent = true, DonationDate = today, PaymentConfirmedAt = today, CreatedAt = today }
            };
            context.Donations.AddRange(donations);
            await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seed extra CMS pages for keys the public frontend reads. The base
    /// seed above already inserts home/about/contact/privacy/terms; the
    /// rows below are admin-editable sections rendered by AboutPage and
    /// ContactPage when present.
    /// </summary>
    private static async Task SeedExtraCmsPagesAsync(GiveAIDDbContext context)
    {
        if (!await context.CmsPages.AnyAsync()) return;

        var extras = new List<CmsPage>
            {
                new CmsPage
                {
                    PageKey = "our_mission",
                    PageSlug = "our-mission",
                    PageTitle = "Our Mission, Vision & Promise",
                    Content = "<p><strong>Mission:</strong> We deliver transparent, evidence-based programmes that provide food, education, healthcare and safe shelter to children who need them most.</p><p><strong>Vision:</strong> We envision a future where no child is denied food, schooling, medical care, or love — and where communities sustain that future themselves.</p><p><strong>Promise:</strong> Every donor receives detailed impact reports. Every programme is independently audited. Every story is told with dignity and consent.</p>",
                    IsActive = true,
                    IsInMenu = false,
                    DisplayOrder = 100,
                    CreatedAt = DateTime.UtcNow
                },
                new CmsPage
                {
                    PageKey = "what_we_do",
                    PageSlug = "what-we-do",
                    PageTitle = "What We Do",
                    Content = "<h3>Four pillars of change</h3><p>Every programme we run falls into one of four pillars — designed to give children the foundations for a healthy, hopeful life.</p><ul><li><strong>Nutritious Meals:</strong> Daily meals, food packages and nutrition programmes that combat child hunger across Vietnam.</li><li><strong>Education Access:</strong> School supplies, scholarships, libraries and free English classes for rural and under-served children.</li><li><strong>Healthcare &amp; Wellness:</strong> Mobile clinics, free health checks, heart surgeries and nutrition support.</li><li><strong>Safe Shelter:</strong> Long-term residential care homes and emergency shelter for orphans and at-risk children.</li></ul>",
                    IsActive = true,
                    IsInMenu = false,
                    DisplayOrder = 101,
                    CreatedAt = DateTime.UtcNow
                },
                new CmsPage
                {
                    PageKey = "contact_info",
                    PageSlug = "contact-info",
                    PageTitle = "Additional Information",
                    Content = "<p><strong>Office hours:</strong> Monday to Friday, 9:00 AM – 6:00 PM (GMT+7).</p><p><strong>Out-of-hours emergencies:</strong> For urgent humanitarian matters, email <a href=\"mailto:emergency@care4kids.org\">emergency@care4kids.org</a>.</p><p><strong>Media &amp; press:</strong> All media inquiries should be directed to <a href=\"mailto:press@care4kids.org\">press@care4kids.org</a>. We respond within 1 business day.</p>",
                    IsActive = true,
                    IsInMenu = false,
                    DisplayOrder = 102,
                    CreatedAt = DateTime.UtcNow
                }
            };

            foreach (var extra in extras)
            {
                if (!await context.CmsPages.AnyAsync(p => p.PageKey == extra.PageKey))
                {
                    context.CmsPages.Add(extra);
                }
            }
            await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seed the canonical admin and demo users.
    ///
    /// Behaviour (idempotent, safe for populated databases):
    ///   • If neither user exists: creates both with the current
    ///     ADMIN_PASSWORD / DEMO_PASSWORD env-var values.
    ///   • If the canonical admin (Username = "admin", Email = "admin@give-aid.org")
    ///     already exists: RE-HASHES its password to the current ADMIN_PASSWORD
    ///     env-var value. This keeps the documented credential in START.bat
    ///     (and equivalent ops runbooks) consistent across first-runs and
    ///     re-runs of the seeder. The hash is the only field touched; FullName,
    ///     Role, IsActive, IsVerified and CreatedAt are preserved.
    ///   • If the demo user exists: left untouched (its password was set
    ///     with whatever DEMO_PASSWORD was at first-run; we do not clobber it).
    ///   • Any other user accounts (e.g. registered donors, additional
    ///     admins created at runtime) are NEVER modified by the seeder.
    ///   • ADMIN_PASSWORD remains required (≥ 8 chars). The check is performed
    ///     unconditionally so that environments without the env var fail fast
    ///     rather than silently leaving an un-hashable admin row.
    ///
    /// SECURITY: passwords come from environment variables (no defaults);
    /// see the calling site for the validation rules.
    /// </summary>
    private static async Task SeedUsersAsync(GiveAIDDbContext context, PasswordHasher passwordHasher)
    {
        var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD");
        if (string.IsNullOrEmpty(adminPassword))
        {
            throw new InvalidOperationException(
                "ADMIN_PASSWORD environment variable is required to seed the database. " +
                "Set it before running (e.g. `$env:ADMIN_PASSWORD='YourSecurePassword'`).");
        }
        if (adminPassword.Length < 8)
        {
            throw new InvalidOperationException("ADMIN_PASSWORD must be at least 8 characters long.");
        }

        var demoPassword = Environment.GetEnvironmentVariable("DEMO_PASSWORD")
            ?? Guid.NewGuid().ToString("N");

        // Use IgnoreQueryFilters so we also pick up the canonical admin row if
        // it has been soft-deleted in the past — the operator's intent for
        // "make ADMIN_PASSWORD work" should win over a stale soft-delete.
        var existingAdmin = await context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u =>
                u.Username == "admin" &&
                u.Email == "admin@give-aid.org");

        if (existingAdmin != null)
        {
            // Idempotent re-hash: align the canonical admin's stored hash
            // with whatever ADMIN_PASSWORD is currently configured. This is
            // the only field we write, and only for the canonical admin —
            // it does not touch any other account and does not run any
            // schema-changing operation.
            existingAdmin.PasswordHash = passwordHasher.Hash(adminPassword);
            existingAdmin.PasswordChangedAt = DateTime.UtcNow;
            existingAdmin.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
            return;
        }

        var adminUser = new User
        {
            Username = "admin",
            Email = "admin@give-aid.org",
            PasswordHash = passwordHasher.Hash(adminPassword),
            FullName = "System Administrator",
            Role = "Admin",
            IsActive = true,
            IsVerified = true,
            CreatedAt = DateTime.UtcNow
        };

        // Demo user: only create if it does not already exist. We deliberately
        // do NOT re-hash an existing demo account (its DEMO_PASSWORD may have
        // been rotated at runtime).
        var demoExists = await context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Username == "demo");

        var demoUser = demoExists
            ? null
            : new User
            {
                Username = "demo",
                Email = "demo@give-aid.org",
                PasswordHash = passwordHasher.Hash(demoPassword),
                FullName = "Demo User",
                Role = "User",
                IsActive = true,
                IsVerified = true,
                CreatedAt = DateTime.UtcNow
            };

        if (demoUser != null)
        {
            context.Users.AddRange(adminUser, demoUser);
        }
        else
        {
            context.Users.Add(adminUser);
        }
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Canonical partner / NGO list rendered on the public "Our Partners"
    /// page. Idempotent by <see cref="Organization.OrganizationName"/> —
    /// inserting a duplicate is a no-op, so the seed can be re-run on every
    /// application startup without producing duplicate rows.
    /// </summary>
    private static async Task SeedOrganizationsAsync(GiveAIDDbContext context)
    {
        var now = DateTime.UtcNow;

        // Match the 9 organizations currently displayed on the public
        // /about/partners page (see GiveAID.Client/src/data/sampleOrganizations.js).
        var seedOrgs = new[]
        {
            new
            {
                Name = "Vietnam Red Cross Society",
                Type = "Government",
                Description = "National humanitarian organization providing emergency relief, healthcare, and disaster response across Vietnam.",
                LogoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Red_Cross_logo.svg/240px-Red_Cross_logo.svg.png",
                WebsiteUrl = "https://redcross.org.vn",
                Email = "info@redcross.org.vn",
                Phone = "+84 24 3822 4030",
                Address = "82 Nguyễn Du, Hai Bà Trưng, Hà Nội",
                RegNum = "RC-001",
                Mission = "To prevent and alleviate human suffering wherever it may be found.",
                Vision = "A world where everyone acts with humanity.",
                Amount = 2_500_000_000m,
                ContribType = "Cash + In-kind",
                Featured = true,
                Order = 1
            },
            new
            {
                Name = "UNICEF Vietnam",
                Type = "NGO",
                Description = "United Nations Children's Fund — protecting children's rights, providing healthcare and education to vulnerable children in Vietnam.",
                LogoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/UNICEF_Logo.png/240px-UNICEF_Logo.png",
                WebsiteUrl = "https://www.unicef.org/vietnam",
                Email = "hanoi@unicef.org",
                Phone = "+84 24 3857 3666",
                Address = "81A Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
                RegNum = (string?)null,
                Mission = "To advocate for the protection of children's rights, to help meet their basic needs and to expand their opportunities to reach their full potential.",
                Vision = (string?)null,
                Amount = 5_000_000_000m,
                ContribType = "Cash",
                Featured = true,
                Order = 2
            },
            new
            {
                Name = "Saigon Children's Charity",
                Type = "NGO",
                Description = "Helping disadvantaged children in southern Vietnam access education, healthcare and social welfare programmes since 1992.",
                LogoUrl = (string?)null,
                WebsiteUrl = "https://www.saigonchildren.com",
                Email = "info@saigonchildren.com",
                Phone = "+84 28 3827 7305",
                Address = "Level 3, 38B Phan Đình Phùng, Quận Phú Nhuận, TP.HCM",
                RegNum = "SCC-VN-001",
                Mission = "To enable disadvantaged children to escape poverty through education and healthcare.",
                Vision = (string?)null,
                Amount = 850_000_000m,
                ContribType = "Cash + In-kind",
                Featured = true,
                Order = 3
            },
            new
            {
                Name = "Vingroup Foundation",
                Type = "Corporate",
                Description = "Corporate social responsibility arm of Vingroup — funding scholarships, infrastructure and healthcare programmes nationwide.",
                LogoUrl = (string?)null,
                WebsiteUrl = "https://vingroup.net/foundation",
                Email = "foundation@vingroup.net",
                Phone = "+84 24 3974 9999",
                Address = "Số 7, Đại lộ Bằng Lăng 1, Vinhomes Riverside, Long Biên, Hà Nội",
                RegNum = "VG-FDN-2017",
                Mission = "For a better life for Vietnamese people through education, healthcare and sustainable development.",
                Vision = (string?)null,
                Amount = 8_700_000_000m,
                ContribType = "Cash",
                Featured = true,
                Order = 4
            },
            new
            {
                Name = "KOTO Foundation",
                Type = "NGO",
                Description = "Know One Teach One — providing hospitality training and education to at-risk youth across Vietnam.",
                LogoUrl = (string?)null,
                WebsiteUrl = "https://koto.com.au",
                Email = "info@koto.com.au",
                Phone = "+84 24 3718 4844",
                Address = "270 Nguyễn Tri Phương, Đống Đa, Hà Nội",
                RegNum = (string?)null,
                Mission = "Empowering at-risk youth through vocational training in hospitality.",
                Vision = (string?)null,
                Amount = 420_000_000m,
                ContribType = "Cash + In-kind",
                Featured = true,
                Order = 5
            },
            new
            {
                Name = "Hội Bảo Trợ Trẻ Em Việt Nam",
                Type = "NGO",
                Description = "Vietnam Children's Protection Association — advocating for child rights and welfare policies.",
                LogoUrl = (string?)null,
                WebsiteUrl = (string?)null,
                Email = "contact@hbtt.org.vn",
                Phone = "+84 24 3934 5678",
                Address = "35 Hai Bà Trưng, Hoàn Kiếm, Hà Nội",
                RegNum = "VPA-2015",
                Mission = "Bảo vệ và thúc đẩy quyền trẻ em Việt Nam.",
                Vision = (string?)null,
                Amount = 650_000_000m,
                ContribType = "In-kind",
                Featured = false,
                Order = 6
            },
            new
            {
                Name = "FPT Software Cares",
                Type = "Corporate",
                Description = "Tech-for-good initiative by FPT — building digital literacy programmes for rural schools.",
                LogoUrl = (string?)null,
                WebsiteUrl = "https://fptsoftware.com/csr",
                Email = "cares@fptsoftware.com",
                Phone = "+84 24 7300 8866",
                Address = "FPT Tower, 10 Phố Tố Hữu, Nam Từ Liêm, Hà Nội",
                RegNum = (string?)null,
                Mission = (string?)null,
                Vision = (string?)null,
                Amount = 1_200_000_000m,
                ContribType = "Cash + Technology",
                Featured = false,
                Order = 7
            },
            new
            {
                Name = "WHO Vietnam",
                Type = "Government",
                Description = "World Health Organization country office — supporting public health programmes in Vietnam.",
                LogoUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/WHO_logo.svg/240px-WHO_logo.svg.png",
                WebsiteUrl = "https://www.who.int/vietnam",
                Email = "who-vietnam@who.int",
                Phone = "+84 24 3857 3668",
                Address = "63 Tran Hung Dao, Hoan Kiem, Hanoi",
                RegNum = (string?)null,
                Mission = "Health for all, everywhere.",
                Vision = (string?)null,
                Amount = 3_400_000_000m,
                ContribType = "Technical assistance",
                Featured = false,
                Order = 8
            },
            new
            {
                Name = "Đoàn Thanh Niên Cộng Sản Hồ Chí Minh",
                Type = "Government",
                Description = "Ho Chi Minh Communist Youth Union — mobilising youth volunteers for community programmes nationwide.",
                LogoUrl = (string?)null,
                WebsiteUrl = (string?)null,
                Email = "doanthanhnien@tphcm.gov.vn",
                Phone = "+84 28 3822 1234",
                Address = "1 Đồng Khởi, Quận 1, TP.HCM",
                RegNum = (string?)null,
                Mission = (string?)null,
                Vision = (string?)null,
                Amount = 280_000_000m,
                ContribType = "Volunteer hours",
                Featured = false,
                Order = 9
            }
        };

        // Pre-load existing names so we can skip them — no duplicates.
        var existingNames = (await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(context.Organizations.Select(o => o.OrganizationName))).ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var s in seedOrgs)
        {
            if (existingNames.Contains(s.Name)) continue;

            context.Organizations.Add(new Organization
            {
                OrganizationName = s.Name,
                OrganizationType = s.Type,
                Description = s.Description,
                LogoUrl = s.LogoUrl,
                WebsiteUrl = s.WebsiteUrl,
                ContactEmail = s.Email,
                ContactPhone = s.Phone,
                Address = s.Address,
                RegistrationNumber = s.RegNum,
                Mission = s.Mission,
                Vision = s.Vision,
                ContributionAmount = s.Amount,
                ContributionType = s.ContribType,
                IsActive = true,
                IsFeatured = s.Featured,
                DisplayOrder = s.Order,
                CreatedAt = now
            });
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seed the demo campaigns, linking them to canonical Causes and
    /// Organizations. Idempotent by <see cref="Campaign.CampaignCode"/>.
    ///
    /// DATA-INTEGRITY NOTE: every seeded campaign starts with
    /// <c>RaisedAmount = 0</c> so that the invariant
    /// <c>campaigns.raised_amount = SUM(amount WHERE payment_status='Completed' AND is_deleted=0)</c>
    /// holds from the very first request. The canonical aggregate grows
    /// through the IAtomicCampaignUpdater flow (Pending -> Completed) and
    /// can be reconciled with the
    /// <c>POST /api/v1/campaigns/recalculate-raised-amounts</c> endpoint.
    /// </summary>
    private static async Task SeedCampaignsAsync(GiveAIDDbContext context)
    {
        var existingCodes = (await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(context.Campaigns.Select(c => c.CampaignCode)))
            .Where(c => c != null)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (existingCodes.Count > 0) return; // already seeded

        var educationCause = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(context.Causes, c => c.CauseCode == "EDU");
        var healthCause = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(context.Causes, c => c.CauseCode == "HEALTH");
        var childCause = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(context.Causes, c => c.CauseCode == "CHILD");

        // All three Care4Kids parent causes are required.
        if (educationCause == null || healthCause == null || childCause == null)
            return;

        var redCross = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(context.Organizations, o => o.OrganizationName.Contains("Red Cross"));
        var unicef = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(context.Organizations, o => o.OrganizationName.Contains("UNICEF"));

        var today = DateTime.UtcNow;
        var campaigns = new List<Campaign>
        {
            new Campaign
            {
                CauseId = childCause.CauseId,
                OrganizationId = redCross?.OrganizationId,
                CampaignName = "Bữa Cơm Có Thịt — 5,000 nutritious meals for Saigon children",
                CampaignCode = "CMP-001",
                ProgrammeType = "ChildWelfare",
                RegistrationRequired = false,
                Description = CampaignCopy.Build(
                    campaignName: "Bữa Cơm Có Thịt — 5,000 nutritious meals for Saigon children",
                    causeName: "Child Welfare",
                    programmeType: "ChildWelfare",
                    beneficiariesCount: 850,
                    goalAmount: 120000000m,
                    raisedAmount: 0m,
                    status: "Active"),
                GoalAmount = 120_000_000m,
                RaisedAmount = 0m,
                StartDate = today.AddDays(-30),
                EndDate = today.AddDays(60),
                ImageUrl = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=80",
                BeneficiariesCount = 850,
                Location = "TP. Hồ Chí Minh",
                Status = "Active",
                IsFeatured = true,
                DisplayOrder = 1,
                CreatedBy = "1",
                CreatedAt = today
            },
            new Campaign
            {
                CauseId = educationCause.CauseId,
                OrganizationId = unicef?.OrganizationId,
                CampaignName = "Sách Vở Cho Em Đến Trường — 1,500 back-to-school kits",
                CampaignCode = "CMP-002",
                ProgrammeType = "Education",
                RegistrationRequired = false,
                Description = CampaignCopy.Build(
                    campaignName: "Sách Vở Cho Em Đến Trường — 1,500 back-to-school kits",
                    causeName: "Education for Children",
                    programmeType: "Education",
                    beneficiariesCount: 1500,
                    goalAmount: 900000000m,
                    raisedAmount: 0m,
                    status: "Active"),
                GoalAmount = 900_000_000m,
                RaisedAmount = 0m,
                StartDate = today.AddDays(-14),
                EndDate = today.AddDays(120),
                ImageUrl = "https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=900&q=80",
                BeneficiariesCount = 1500,
                Location = "Lào Cai, Sơn La",
                Status = "Active",
                IsFeatured = false,
                DisplayOrder = 2,
                CreatedBy = "1",
                CreatedAt = today
            },
            new Campaign
            {
                CauseId = healthCause.CauseId,
                CampaignName = "Khám Sức Khỏe Miễn Phí — 30 mobile clinics",
                CampaignCode = "CMP-003",
                ProgrammeType = "HealthCare",
                RegistrationRequired = false,
                Description = CampaignCopy.Build(
                    campaignName: "Khám Sức Khỏe Miễn Phí — 30 mobile clinics",
                    causeName: "Healthcare Support",
                    programmeType: "HealthCare",
                    beneficiariesCount: 3000,
                    goalAmount: 450000000m,
                    raisedAmount: 0m,
                    status: "Active"),
                GoalAmount = 450_000_000m,
                RaisedAmount = 0m,
                StartDate = today.AddDays(-60),
                EndDate = today.AddDays(30),
                ImageUrl = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
                BeneficiariesCount = 3000,
                Location = "Nghệ An, Quảng Nam, Bến Tre",
                Status = "Active",
                IsFeatured = true,
                DisplayOrder = 3,
                CreatedBy = "1",
                CreatedAt = today
            },
            new Campaign
            {
                CauseId = childCause.CauseId,
                CampaignName = "Mái Ấm Tình Thương — Three new care homes",
                CampaignCode = "CMP-004",
                ProgrammeType = "ChildWelfare",
                RegistrationRequired = true,
                MaxParticipants = 50,
                TargetBeneficiaries = 150,
                Description = CampaignCopy.Build(
                    campaignName: "Mái Ấm Tình Thương — Three new care homes",
                    causeName: "Child Welfare",
                    programmeType: "ChildWelfare",
                    beneficiariesCount: 150,
                    goalAmount: 2500000000m,
                    raisedAmount: 0m,
                    status: "Active"),
                GoalAmount = 2_500_000_000m,
                RaisedAmount = 0m,
                StartDate = today.AddDays(-90),
                EndDate = today.AddDays(180),
                ImageUrl = "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=900&q=80",
                BeneficiariesCount = 150,
                Location = "Hà Nội, Đà Nẵng, Cần Thơ",
                Status = "Active",
                IsFeatured = false,
                DisplayOrder = 4,
                CreatedBy = "1",
                CreatedAt = today
            },
            new Campaign
            {
                // The original seed linked this campaign to the (now removed)
                // EMERG cause. On a Care4Kids platform we re-home flood-relief
                // efforts under the Child Welfare cause since the children
                // affected by flooding are the project's primary concern.
                CauseId = childCause.CauseId,
                CampaignName = "Cứu Trợ Lũ Lụt Miền Trung — Children & Families 2026",
                CampaignCode = "CMP-005",
                ProgrammeType = "EmergencyRelief",
                RegistrationRequired = true,
                MaxParticipants = 200,
                TargetBeneficiaries = 10000,
                Description = CampaignCopy.Build(
                    campaignName: "Cứu Trợ Lũ Lụt Miền Trung — Children & Families 2026",
                    causeName: "Child Welfare",
                    programmeType: "EmergencyRelief",
                    beneficiariesCount: 10000,
                    goalAmount: 3000000000m,
                    raisedAmount: 0m,
                    status: "Active"),
                GoalAmount = 3_000_000_000m,
                RaisedAmount = 0m,
                StartDate = today.AddDays(-7),
                EndDate = today.AddDays(45),
                ImageUrl = "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=900&q=80",
                BeneficiariesCount = 10000,
                Location = "Quảng Bình, Hà Tĩnh",
                Status = "Active",
                IsFeatured = true,
                DisplayOrder = 5,
                CreatedBy = "1",
                CreatedAt = today
            },
            new Campaign
            {
                CauseId = educationCause.CauseId,
                CampaignName = "Lớp Học Hy Vọng — Free English Classes",
                CampaignCode = "CMP-006",
                ProgrammeType = "Education",
                RegistrationRequired = false,
                Description = CampaignCopy.Build(
                    campaignName: "Lớp Học Hy Vọng — Free English Classes",
                    causeName: "Education for Children",
                    programmeType: "Education",
                    beneficiariesCount: 600,
                    goalAmount: 600000000m,
                    raisedAmount: 0m,
                    status: "Active"),
                GoalAmount = 600_000_000m,
                RaisedAmount = 0m,
                StartDate = today.AddDays(-45),
                EndDate = today.AddDays(150),
                ImageUrl = "https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=900&q=80",
                BeneficiariesCount = 600,
                Location = "Bình Dương, Long An",
                Status = "Active",
                IsFeatured = false,
                DisplayOrder = 6,
                CreatedBy = "1",
                CreatedAt = today
            },
            new Campaign
            {
                CauseId = healthCause.CauseId,
                CampaignName = "Mổ Tim Miễn Phí Cho Trẻ Em — 50 heart surgeries",
                CampaignCode = "CMP-007",
                ProgrammeType = "HealthCare",
                RegistrationRequired = false,
                Description = CampaignCopy.Build(
                    campaignName: "Mổ Tim Miễn Phí Cho Trẻ Em — 50 heart surgeries",
                    causeName: "Healthcare Support",
                    programmeType: "HealthCare",
                    beneficiariesCount: 50,
                    goalAmount: 5000000000m,
                    raisedAmount: 0m,
                    status: "Active"),
                GoalAmount = 5_000_000_000m,
                RaisedAmount = 0m,
                StartDate = today.AddDays(-180),
                EndDate = today.AddDays(60),
                ImageUrl = "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
                BeneficiariesCount = 50,
                Location = "Hà Nội",
                Status = "Active",
                IsFeatured = false,
                DisplayOrder = 7,
                CreatedBy = "1",
                CreatedAt = today
            },
            new Campaign
            {
                CauseId = childCause.CauseId,
                CampaignName = "Sân Chơi Cho Trẻ Em Nông Thôn — 25 rural playgrounds",
                CampaignCode = "CMP-008",
                ProgrammeType = "ChildWelfare",
                RegistrationRequired = true,
                MaxParticipants = 30,
                TargetBeneficiaries = 5000,
                Description = CampaignCopy.Build(
                    campaignName: "Sân Chơi Cho Trẻ Em Nông Thôn — 25 rural playgrounds",
                    causeName: "Child Welfare",
                    programmeType: "ChildWelfare",
                    beneficiariesCount: 5000,
                    goalAmount: 850000000m,
                    raisedAmount: 0m,
                    status: "Active"),
                GoalAmount = 850_000_000m,
                RaisedAmount = 0m,
                StartDate = today.AddDays(-30),
                EndDate = today.AddDays(120),
                ImageUrl = "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
                BeneficiariesCount = 5000,
                Location = "Tuyên Quang, Bắc Kạn",
                Status = "Active",
                IsFeatured = false,
                DisplayOrder = 8,
                CreatedBy = "1",
                CreatedAt = today
            }
        };

        context.Campaigns.AddRange(campaigns);
        await context.SaveChangesAsync();
    }
}
