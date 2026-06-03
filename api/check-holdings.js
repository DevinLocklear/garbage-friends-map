// ════════════════════════════════════════════════════════
// Vercel Serverless Function — /api/check-holdings.js
// Place this file at: /api/check-holdings.js in your project
// 
// Add to Vercel environment variables:
//   OPENSEA_API_KEY = your OpenSea API key
// ════════════════════════════════════════════════════════

const COLLECTIONS = [
  { stage: 1, slug: 'garbage-bags-official' },
  { stage: 2, slug: 'garbage-cans-1' },
  { stage: 3, slug: 'walking-cans' },
  { stage: 4, slug: 'garbage-friends-main' },
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { wallet } = req.query;

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenSea API key not configured' });
  }

  try {
    const results = await Promise.all(
      COLLECTIONS.map(async (col) => {
        const url = `https://api.opensea.io/api/v2/chain/ethereum/account/${wallet}/nfts?collection=${col.slug}&limit=1`;
        const response = await fetch(url, {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey,
          },
        });

        if (!response.ok) {
          console.error(`OpenSea error for ${col.slug}:`, response.status);
          return null;
        }

        const data = await response.json();
        return data.nfts && data.nfts.length > 0 ? col.stage : null;
      })
    );

    const holdings = results.filter(Boolean);
    return res.status(200).json({ wallet, holdings });
  } catch (error) {
    console.error('Check holdings error:', error);
    return res.status(500).json({ error: 'Failed to check holdings' });
  }
}
