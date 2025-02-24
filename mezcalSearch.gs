function readSheet() {
  let sheet = SpreadsheetApp.getActiveSpreadsheet();
  let mezcalSheet = sheet.getSheetByName("Mezcal");
  let lastRow = mezcalSheet.getLastRow();

  let data = mezcalSheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues();

  data.forEach(function(row, index) { 
    let productName = row[0];  // Column 1 (Brand)
    let agaveType = row[1];    // Column 2 (Agave)

    let searchQuery = `${productName} ${agaveType} buy`;
    googleSearch(searchQuery, mezcalSheet, index + 2); // Pass row number to track writing back to sheet
  });
}

function googleSearch(query, sheet, rowIndex) {
  let apiKey = PropertiesService.getScriptProperties().getProperty('searchKey');
  let searchEngineId = PropertiesService.getScriptProperties().getProperty('searchEngineId');  
  let baseSearchEngineURL = PropertiesService.getScriptProperties().getProperty('baseSearchEngineURL');  
  let url = `${baseSearchEngineURL}${encodeURIComponent(query)}&key=${apiKey}&cx=${searchEngineId}`;

  let response = UrlFetchApp.fetch(url);
  let json = JSON.parse(response.getContentText());

  if (!json.items || json.items.length === 0) {
    console.log(`No results found for ${query}`);
    return;
  }

  console.log(`🔎 Searched: ${query}`);

  let queryWords = query.toLowerCase().split(" "); // Convert query to word array
  let requiredMatches = queryWords.length > 3 ? 3 : 2;
  let bestPrice = null;
  let bestMatch = null;
  let outOfStockMatch = null;

  for (let item of json.items) {
    let title = item.title.toLowerCase();
    let wordMatches = queryWords.filter(word => title.includes(word)).length;

    if (wordMatches >= requiredMatches) {
      console.log(`✅ Checking: ${item.title}`);
      console.log(`🔗 ${item.link}`);

      // Fetch price & stock status
      let { price, outOfStock } = fetchPagePrice(item.link);
      let numericPrice = price ? parseFloat(price) : null;

      console.log(`💰 Price: ${price ? "$" + price : "Not Found"}`);
      console.log(`🚫 Out of Stock: ${outOfStock ? "Yes" : "No"}`);

      // If it's in stock and has a price, check if it's the best price found so far
      if (!outOfStock && numericPrice !== null) {
        if (bestPrice === null || numericPrice < bestPrice) {
          bestPrice = numericPrice;
          bestMatch = {
            title: item.title,
            link: item.link,
            price: `$${numericPrice}`,
            stockStatus: "Available"
          };
        }
      } 

      // Keep track of the first out-of-stock listing as a fallback
      if (outOfStock && !outOfStockMatch) {
        outOfStockMatch = {
          title: item.title,
          link: item.link,
          price: price ? `$${price}` : "N/A",
          stockStatus: "Out of Stock"
        };
      }
    }
  }

  // Write the best available in-stock match, or fallback to an out-of-stock match
  let finalMatch = bestMatch || outOfStockMatch;
  if (finalMatch) {
    sheet.getRange(rowIndex, 5).setValue(finalMatch.title);  
    sheet.getRange(rowIndex, 6).setValue(finalMatch.link);  
    sheet.getRange(rowIndex, 7).setValue(finalMatch.price); 
    sheet.getRange(rowIndex, 8).setValue(finalMatch.stockStatus);
    console.log(`✅ Selected: ${finalMatch.title} (${finalMatch.stockStatus})`);
  }
}


function fetchPagePrice(url) {
  try {
    let response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    let html = response.getContentText();

    let price = null;
    let outOfStock = false;

    // 1️⃣ Refined out-of-stock detection: Check for common out-of-stock keywords
    let outOfStockMatch = html.match(/out of stock|sold out|unavailable|temporarily unavailable/i);
    outOfStock = outOfStockMatch ? true : false;

    // 2️⃣ Check for the "Add to Cart" button presence as an indicator of availability
    if (html.includes("Add to cart") || html.includes("Buy Now")) {
      outOfStock = false;
    }

    // 3️⃣ If item is not out of stock, continue to extract price
    if (!outOfStock) {
      // Check for price in <span> with 'price' class
      let priceMatch = html.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>\s*\$?(\d{1,4}(\.\d{2})?)\s*<\/span>/i);
      if (priceMatch) {
        price = priceMatch[1];
      }

      let salePriceMatch = html.match(/<sale-price[^>]*>\s*<span[^>]*>Sale price<\/span>\$([0-9]+(\.[0-9]{2})?)<\/sale-price>/);
      if (salePriceMatch) {
        price = parseFloat(salePriceMatch[1]).toFixed(2);
      }

      let jsPriceMatch = html.match(/<span class="js" id="price-field">.*?<span class="money">\$?\s*([0-9]+(\.[0-9]{2})?)<\/span>/s);
      if (jsPriceMatch) {
        price = parseFloat(jsPriceMatch[1]).toFixed(2);
      }

      // Check for 'data-product-price-without-tax' attribute as an alternative
      let priceDataMatch = html.match(/<span[^>]*data-product-price-without-tax=""[^>]*class="[^"]*price[^"]*"[^>]*>(\$\d{1,4}(\.\d{2})?)/i);
      if (priceDataMatch) {
        price = priceDataMatch[1].replace(/\$/g, ""); // Remove dollar sign for consistency
      }

      // Additional pattern to handle other types of price formatting
      let woocommercePriceMatch = html.match(/<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">\$(\d{1,4}(\.\d{2})?)<\/span><\/bdi><\/span>/i);
      if (woocommercePriceMatch) {
        price = woocommercePriceMatch[1];
      }
      
      // If no price found, fall back to more generic regex checks
      if (!price) {
        let foundPrices = [];
        let pricePatterns = [
          /(?:Price|Our Price|Retail Price|Single Bottle|Buy Now|Only)\s*\$?(\d{1,4}(\.\d{2})?)/gi,  
          /\$\s*(\d{1,4}(\.\d{2})?)/g,  
          /"price"\s*:\s*"\$?(\d{1,4}(\.\d{2})?)"/  
        ];

        for (let pattern of pricePatterns) {
          let matches = html.match(pattern);
          if (matches) {
            foundPrices.push(...matches.map(p => p.replace(/[^\d.]/g, "")));  
          }
        }

        foundPrices = foundPrices.filter(p => parseFloat(p) > 15);  // Filter out small or unreasonable prices
        if (foundPrices.length > 0) {
          price = foundPrices[0]; 
        }
      }
    } else {
      price = null;
    }

    console.log({ price, outOfStock });
    return { price, outOfStock };
  } catch (error) {
    console.error(`Error fetching page: ${url}`, error);
    return { price: null, outOfStock: false };
  }
}
