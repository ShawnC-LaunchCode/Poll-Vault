const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq, like } = require('drizzle-orm');
const { surveys } = require('./dist/shared/schema');

async function checkSurvey() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  const db = drizzle(pool);

  const publicLink = 'fb23d69b-5943-4630-9637-3ac6fd54f9e9';

  console.log('Looking up survey with publicLink:', publicLink);

  const results = await db
    .select()
    .from(surveys)
    .where(eq(surveys.publicLink, publicLink));

  if (results.length === 0) {
    console.log('❌ No survey found with that public link');

    // Try to find by title
    const byTitle = await db
      .select()
      .from(surveys)
      .where(like(surveys.title, '%jenjen%'));

    console.log('\nSearching for surveys with "jenjen" in title:');
    console.log(JSON.stringify(byTitle, null, 2));
  } else {
    const survey = results[0];
    console.log('\n✅ Survey found!');
    console.log('Title:', survey.title);
    console.log('Status:', survey.status);
    console.log('Allow Anonymous:', survey.allowAnonymous);
    console.log('Anonymous Access Type:', survey.anonymousAccessType);
    console.log('Public Link:', survey.publicLink);
    console.log('\n🔍 Diagnosis:');

    if (survey.status !== 'open') {
      console.log('❌ Problem: Survey status is NOT "open" (current:', survey.status + ')');
      console.log('   Fix: Change survey status to "open" or toggle the Active switch in the builder');
    }

    if (!survey.allowAnonymous) {
      console.log('❌ Problem: Anonymous access is NOT enabled');
      console.log('   Fix: Go to Publish tab and enable anonymous access');
    }

    if (survey.status === 'open' && survey.allowAnonymous) {
      console.log('✅ Survey should be accessible!');
    }
  }

  await pool.end();
}

checkSurvey().catch(console.error);
