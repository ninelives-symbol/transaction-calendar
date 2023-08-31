import mongodb from 'mongodb';
import { decode as base32decode, encode as base32encode } from 'thirty-two';
import symbolSdk from 'symbol-sdk';

const { MongoClient } = mongodb;
const { Binary, Long } = mongodb;

function hexToBigInt(hexString) {
  return BigInt(`0x${hexString}`).toString();
}

async function fetchMosaicDivisibility(client, mosaicId) {
  console.log('Fetching mosaic divisibility...');
  console.log('Mosaic ID:', mosaicId);

  if (!mosaicId) {
    console.error('mosaicId is not defined');
    return;
  }

  try {
    const mosaicIdDecimal = hexToBigInt(mosaicId);
    console.log('Mosaic ID (Decimal):', mosaicIdDecimal);

    const collection = client.db('catapult').collection('mosaics');
    const mosaic = await collection.findOne({ 'mosaic.id': Long.fromString(mosaicIdDecimal) });

    if (!mosaic) {
      console.error('Mosaic not found');
      return;
    }

    const divisibility = mosaic.mosaic.divisibility;

    console.log('Mosaic Divisibility:', divisibility);
    return divisibility;
  } catch (error) {
    console.error('Error fetching mosaic divisibility:', error);
    throw error;
  }
}

async function fetchData(client, address, mosaicIdHex) {
  console.log('Fetching data...');
  console.log('Address:', address);
  console.log('Mosaic:', mosaicIdHex);

  const facade = new symbolSdk.facade.SymbolFacade('mainnet');

  const collection = client.db('catapult').collection('transactions');
  const blocksCollection = client.db('catapult').collection('blocks');

  const encodedAddress = base32decode(address);
  console.log(`Encoded address: ${encodedAddress.toString('hex')}`);
  const encodedAddresses = new Binary(encodedAddress);

  const mosaicIdDecimal = hexToBigInt(mosaicIdHex);
  console.log('Mosaic ID (Decimal):', mosaicIdDecimal);

  const cursor = collection.find({
    'meta.addresses': { $in: [encodedAddresses] },
    'transaction.mosaics.id': { $eq: Long.fromString(mosaicIdDecimal) },
  });

  const mosaicDivisibility = await fetchMosaicDivisibility(client, mosaicIdHex);

  console.log('Mosaic Divisibility:', mosaicDivisibility);

  const transactionArray = await cursor.toArray();
  const transactionPromises = transactionArray.map(async (doc) => {
    if (doc.transaction && doc.transaction.mosaics) {
      const block = await blocksCollection.findOne({ 'block.height': doc.meta.height });

      if (block && block.block && block.block.timestamp) {
        const blockTimestamp = block.block.timestamp;
        const blockTimestampMS = blockTimestamp + 1615853185000;

        return doc.transaction.mosaics.reduce((transactions, mosaicRes) => {
          if (mosaicRes.id.toString() === mosaicIdDecimal) {
            const amount = mosaicRes.amount / Math.pow(10, mosaicDivisibility);
            const formattedAmount = parseFloat(amount.toFixed(mosaicDivisibility));

            const recipientBuffer = doc.transaction.recipientAddress.buffer;
            const recipient = base32encode(recipientBuffer).toString().slice(0, 39);

            const senderBuffer = doc.transaction.signerPublicKey.buffer;
            const sender = senderBuffer.toString('hex');

            const publicKey = new symbolSdk.PublicKey(sender);
            const senderAddress = facade.network.publicKeyToAddress(publicKey).toString();
            
            const transactionHashBuffer = doc.meta.hash.buffer;
            const transactionHash = transactionHashBuffer.toString('hex');


            transactions.push({
              sender: senderAddress,
              recipient: recipient,
              amount: formattedAmount,
              timestamp: blockTimestampMS,
              hash: transactionHash,

            });
          }
          return transactions;
        }, []);
      }
    }
    return [];
  });

  const transactionResults = await Promise.all(transactionPromises);
  const transactions = transactionResults.flat();

  return transactions;
}

export default fetchData;