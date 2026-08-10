require('dotenv').config();

async function checkEliceModels() {
  // Replace this with your actual Elice Endpoint URL
  const baseUrl = process.env.ELICE_BASE_URL || "https://api.elice.ai/v1"; 
  const apiKey = process.env.ELICE_API_KEY;

  if (!apiKey) {
    console.error("❌ ELICE_API_KEY not found in .env file.");
    return;
  }

  console.log(`🔍 Checking available models at: ${baseUrl}/models`);

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || JSON.stringify(data));
    }

    console.log("\n✅ Available Models from Elice:");
    if (data && data.data) {
      data.data.forEach((model, index) => {
        console.log(`${index + 1}. ${model.id}`);
      });
    } else {
      console.log(data);
    }
  } catch (error) {
    console.error("\n❌ Error fetching models:");
    console.error(error.message);
    console.log("\nPlease ensure your ELICE_BASE_URL is correct in the .env file.");
  }
}

checkEliceModels();
