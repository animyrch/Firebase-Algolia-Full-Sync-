// Import necessary modules
const admin = require('firebase-admin');
const algoliasearch = require('algoliasearch');
require('dotenv').config(); // Load environment variables from .env file
const propertiesToExclude = require('./exclude-properties');

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  authUri: process.env.FIREBASE_AUTH_URI,
  tokenUri: process.env.FIREBASE_TOKEN_URI,
  authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
});

// Initialize Algolia
const algoliaConfig = {
  apiKey: process.env.ALGOLIA_API_KEY,
  appId: process.env.ALGOLIA_APP_ID,
  indexName: process.env.ALGOLIA_INDEX_NAME,
};

const algoliaClient = algoliasearch(algoliaConfig.appId, algoliaConfig.apiKey);
const algoliaIndex = algoliaClient.initIndex(algoliaConfig.indexName);

// Specify the Firebase collection
const firebaseCollection = process.env.FIREBASE_COLLECTION;

// Fetch data from Firebase
async function fetchDataFromFirebase() {
  try {
    const snapshot = await admin.firestore().collection(firebaseCollection).get();
    const documents = snapshot.docs.map(doc => {
        const data = { objectID: doc.id, ...doc.data() };
  
        // Remove excluded properties
        propertiesToExclude.forEach(property => {
          delete data[property];
        });
  
        return data;
      });
    return documents;
  } catch (error) {
    console.error('Error fetching data from Firebase:', error);
    throw error;
  }
}

// Sync data to Algolia
async function syncDataToAlgolia(data) {
  try {
    const result = await algoliaIndex.saveObjects(data);
    console.log('Synced to Algolia:', result);
  } catch (error) {
    console.error('Error syncing to Algolia:', error);
    throw error;
  }
}

// Main function to execute the synchronization
async function main() {
  try {
    const firebaseData = await fetchDataFromFirebase();
    await syncDataToAlgolia(firebaseData);
    process.exit(0); // Exit successfully
  } catch (error) {
    process.exit(1); // Exit with an error
  }
}

// Execute the main function
main();
