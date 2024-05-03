const axios = require("axios");
const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const STRAPI_BASE_URL = "strapi_url_here";
const WEBSITE_BASE_URL = "website_url_here";

let seoToolsEntries = [];

const axiosInstance = axios.create({
  baseURL: STRAPI_BASE_URL,
  // Uncomment and replace 'YOUR_JWT_TOKEN' with your actual token if needed
  // headers: {
  //   'Authorization': 'Bearer YOUR_JWT_TOKEN',
  // },
});

async function updateOrCreateSEOTool(slug, fullPath, isIndexable = true) {
  try {
    const seoToolsData = {
      url: fullPath,
      indexable: isIndexable ? "index" : "noindex",
      remove_from_sitemap: false,
      priority: 0.5,
      change_frequency: "weekly",
    };

    seoToolsEntries.push(seoToolsData);

    await axios.post(`${STRAPI_BASE_URL}/sitemaps`, seoToolsData);
    console.log(
      `Created new SEOTools entry for slug: ${slug} with path: ${fullPath}`
    );
  } catch (error) {
    console.error(
      `Failed to update/create SEOTools entry for ${slug} with path: ${fullPath}:`,
      error.message
    );
  }
}

async function fetchSlugsAndCreateSEOTools(contentType) {
  try {
    const response = await axios.get(
      `${STRAPI_BASE_URL}/${contentType}?_limit=-1`
    );
    let slugs;
    if (contentType === "posts") {
      slugs = response.data.map((post) => {
        // If the post has a main_category, prepend its slug to the post's slug
        return post.main_category
          ? `${post.main_category.slug}/${post.slug}`
          : post.slug;
      });
    } else {
      slugs = response.data.map((item) => item.slug);
    }
    console.log(`Slugs for ${contentType}:`, slugs);

    let urlPrefix = "";
    switch (contentType) {
      case "podcasts":
        urlPrefix = "/podcast/";
        break;
      case "posts":
        urlPrefix = "/blog/";
        break;
      case "pages":
        urlPrefix = "/";
        break;
      case "case-studies":
        urlPrefix = "/case-studies/";
        break;
      default:
        console.error(`Unknown content type: ${contentType}`);
        return;
    }

    const csvWriter = createCsvWriter({
      path: `${contentType}-slugs.csv`,
      header: [
        { id: "slug", title: "SLUG" },
        { id: "fullPath", title: "FULL PATH" },
      ],
    });

    // Create a special record for the TLD with prefix
    const tldWithPrefixRecord = {
      slug: "TLD with Prefix",
      fullPath: `${WEBSITE_BASE_URL}${urlPrefix}`.slice(0, -1), // Remove trailing slash for aesthetics
    };

    const records = slugs.map((slug) => {
      const fullPath = `${WEBSITE_BASE_URL}${urlPrefix}${slug}`;
      return { slug, fullPath };
    });

    // Prepend the TLD with prefix record to the records array
    records.unshift(tldWithPrefixRecord);

    await csvWriter
      .writeRecords(records)
      .then(() =>
        console.log(
          `The CSV file was written successfully to ${contentType}-slugs.csv`
        )
      );

    // Skip the first record (TLD with prefix) when updating or creating SEO tools
    for (const record of records.slice(1)) {
      await updateOrCreateSEOTool(record.slug, record.fullPath);
    }
  } catch (error) {
    console.error(`Failed to fetch slugs for ${contentType}:`, error.message);
  }
}

async function main() {
  await fetchSlugsAndCreateSEOTools("podcasts");
  await fetchSlugsAndCreateSEOTools("posts");
  await fetchSlugsAndCreateSEOTools("pages");
  await fetchSlugsAndCreateSEOTools("case-studies");

  fs.writeFile(
    "seoToolsEntries.json",
    JSON.stringify(seoToolsEntries, null, 2),
    (err) => {
      if (err) throw err;
      console.log("Data written to seoToolsEntries.json");
    }
  );
}

main();
