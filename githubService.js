require('dotenv').config();

const axios = require('axios');

const BASE_URL =
`https://api.github.com/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/contents/products.json`;

async function getFile() {

  const response = await axios.get(
    BASE_URL,
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`
      }
    }
  );

  const decoded =
    Buffer.from(
      response.data.content,
      'base64'
    ).toString();

  return {
    json: JSON.parse(decoded),
    sha: response.data.sha
  };

}

async function addProduct(product) {

  const file = await getFile();

  // Safety structure
  if (!file.json.products) {
    file.json.products = [];
  }

  // Add new product
  file.json.products.push(product);

  // Update timestamp
  file.json.lastUpdated =
    new Date().toISOString();

  // Convert back
  const updatedContent =
    Buffer.from(
      JSON.stringify(file.json, null, 2)
    ).toString('base64');

  // Upload
  await axios.put(
    BASE_URL,
    {
      message: `Add ${product.name}`,
      content: updatedContent,
      sha: file.sha
    },
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`
      }
    }
  );

}

module.exports = {
  addProduct
};