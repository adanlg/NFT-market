import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import { Row, Col, Card ,Form, Button} from 'react-bootstrap';
import { convertUriFormat } from './uriUtils.js';

export default function MyPurchases({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [sellPrice, setPrice] = useState(null)

  const loadPurchasedItems = async () => {
    try {
      // Fetch purchased items from marketplace by querying Offered events with the buyer set as the user
      const filter = marketplace.filters.Bought(null, null, null, null, null, account);
      const results = await marketplace.queryFilter(filter);
  
      // Fetch metadata of each nft and add that to listedItem object.
      const purchases = await Promise.all(results.map(async (i) => {
        try {
          // fetch arguments from each result
          i = i.args;
  
          // get uri url from nft contract
          const newUri = await nft.tokenURI(i.tokenId);
          const uri = convertUriFormat(newUri);
          const response = await fetch(uri);
          const metadata = await response.json();
  
          // get total price of item (item price + fee)
          const totalPrice = await marketplace.getTotalPrice(i.itemId);
  
          // define listed item object
          const imageUri = convertUriFormat(metadata.image);
  
          let purchasedItem = {
            totalPrice,
            price: i.price,
            itemId: i.itemId,
            name: metadata.name,
            description: metadata.description,
            image: imageUri
          };
  
          return purchasedItem;
        } catch (error) {
          console.log("Burn token is bad :(:", error);
          return null;
        }
      }));
  
      // Filter out any null values from the purchases array
      const validPurchases = purchases.filter(item => item !== null);
  
      setLoading(false);
      setPurchases(validPurchases);
    } catch (error) {
      console.log("Error loading purchased items:", error);
    }
  };
  
  const burnItem = async (purchasedItem) => {
    await (await nft.burn(purchasedItem.itemId)).wait();
    loadPurchasedItems();
  };

  const sellItem = async (purchasedItem) => {
    console.log("nft:", nft);
    console.log("itemId:", purchasedItem.itemId);
    console.log("sellPrice:", sellPrice);
    if (!nft || !purchasedItem.itemId || !sellPrice) return
    try{
      await (await marketplace.offerTokenForSale(nft,purchasedItem.itemId,sellPrice)).wait()
    } catch(error) {
      console.log("You can't sell this token: ", error)
    };
    loadPurchasedItems();
  };

  useEffect(() => {
    loadPurchasedItems();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: "1rem 0" }}>
        <h2>Loading...</h2>
      </main>
    );
  }

  return (
    <div className="flex justify-center">
      {purchases.length > 0 ? (
        <div className="px-5 container">
          <Row xs={1} md={2} lg={4} className="g-4 py-5">
            {purchases.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Footer>
                  <div className='d-grid'>
                      <Form.Control onChange={(e) => setPrice(e.target.value)} size="lg" required type="number" placeholder="Price in ETH" />
                      <Button onClick={() => sellItem(item)} variant="primary" size="lg">
                        Sell
                      </Button>
                    </div>

                    <div className='d-grid' style={{ margin: '10px' }}>
                      <Button onClick={() => burnItem(item)} variant="danger" size="lg">
                        Burn 
                      </Button>
                    </div>
                    
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        <main style={{ padding: "1rem 0" }}>
          <h2>No purchases</h2>
        </main>
      )}
    </div>
  );
}
