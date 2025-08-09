// Script to fetch and extract Fear & Greed Index values from Binance Square page

const fs = require('fs');
const path = require('path');

async function fearGreedHighestSearched() {
  const res = await fetch("https://www.binance.com/bapi/composite/v1/friendly/pgc/card/fearGreedHighestSearched", {
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7",
      "bnc-level": "0",
      "bnc-location": "VN",
      "bnc-time-zone": "Asia/Saigon",
      "bnc-uuid": "be978f8b-5b11-4f74-ad24-dde2b865f94b",
      "clienttype": "web",
      "content-type": "application/json",
      "csrftoken": "a846cca07b1168bf8b78b8794f3b0c09",
      "device-info": "eyJzY3JlZW5fcmVzb2x1dGlvbiI6IjM0NDAsMTQ0MCIsImF2YWlsYWJsZV9zY3JlZW5fcmVzb2x1dGlvbiI6IjMzODAsMTQxNSIsInN5c3RlbV92ZXJzaW9uIjoiTWFjIE9TIDEwLjE1LjciLCJicmFuZF9tb2RlbCI6IiBBcHBsZSBNYWNpbnRvc2ggIiwic3lzdGVtX2xhbmciOiJlbi1VUyIsInRpbWV6b25lIjoiR01UKzA3OjAwIiwidGltZXpvbmVPZmZzZXQiOi00MjAsInVzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTM4LjAuMC4wIFNhZmFyaS81MzcuMzYiLCJsaXN0X3BsdWdpbiI6IlBERiBWaWV3ZXIsQ2hyb21lIFBERiBWaWV3ZXIsQ2hyb21pdW0gUERGIFZpZXdlcixNaWNyb3NvZnQgRWRnZSBQREYgVmlld2VyLFdlYktpdCBidWlsdC1pbiBQREYiLCJjYW52YXNfY29kZSI6IjdhYjQ1ZmUxIiwid2ViZ2xfdmVuZG9yIjoiR29vZ2xlIEluYy4gKEFwcGxlKSIsIndlYmdsX3JlbmRlcmVyIjoiQU5HTEUgKEFwcGxlLCBBTkdMRSBNZXRhbCBSZW5kZXJlcjogQXBwbGUgTTQsIFVuc3BlY2lmaWVkIFZlcnNpb24pIiwiYXVkaW8iOiIxMjQuMDQzNDgxNTU4NzY1MDUiLCJwbGF0Zm9ybSI6Ik1hY0ludGVsIiwid2ViX3RpbWV6b25lIjoiQXNpYS9TYWlnb24iLCJkZXZpY2VfbmFtZSI6IkNocm9tZSBWMTM4LjAuMC4wIChNYWMgT1MpIiwiZmluZ2VycHJpbnQiOiIxOWUwZGE2MjVkZTJhM2Q3Zjk1ZTZiNDk3NGIyMWFmOCIsImRldmljZV9pZCI6IiIsInJlbGF0ZWRfZGV2aWNlX2lkcyI6IiJ9",
      "fvideo-id": "337f2d16ef5ba317bc830deb35efe59faf0e1340",
      "fvideo-token": "KzZ3v5gHpAX7QAoUbNMkIbwUns9PUpwivvnsCuYC0sVW4Ln9mgft4Y2pN3D/fFXfoixIgV2Irk4+it0OJyjR/X070i4NjHPt5nCDl9xZN9n5gDsmnBO3/ZnyfCpUkVlhKBdzFQ+xPy/XENftnAWtPjVXW+Izf0FNq+TKcR1gXOi6BwyrtsYIyNlkZdiPRke1w=77",
      "lang": "en",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-passthrough-token": "",
      "x-trace-id": "5bbeb8d6-bff6-4f20-beb3-d2ff0944f7fb",
      "x-ui-request-trace": "5bbeb8d6-bff6-4f20-beb3-d2ff0944f7fb",
      "cookie": "bnc-uuid=be978f8b-5b11-4f74-ad24-dde2b865f94b; BNC_FV_KEY=337f2d16ef5ba317bc830deb35efe59faf0e1340; userPreferredCurrency=USD_USD; language=en; se_gd=xUWCQThpQRPCRIFxQFVYgZZVACQcABXWlMBJcVUBldUVQGVNWVUW1; se_gsd=SjMlPztxNjIiCRIyITU3GjYyUVUOAgpbVlpLVVFWV1dSM1NT1; OptanonAlertBoxClosed=2025-05-01T02:11:19.593Z; BNC-Location=VN; lang=en; changeBasisTimeZone=; g_state={\"i_l\":0}; _gcl_au=1.1.1463854681.1747491979; theme=dark; neo-theme=dark; se_sd=gVRUAQAsHQFU1QGEEEQwgZZERARQXEUVFBTBaUkR1VVVQElNWVtS1; currentAccount=; isAccountsLoggedIn=y; _gid=GA1.2.1468648975.1754257420; s9r1=E7378E9483F38D8445B60C02B6EB3B45; r20t=web.E0319BC6CCE3AD43735EEC7B1EF43208; r30t=1; cr00=FAC140C2808911B0CA9C47CB293E4B73; d1og=web.35889085.04BDB4DCA0F8E45594924CA28770F3A2; r2o1=web.35889085.89D2BF10A8EB5142983996F4CFAA325D; f30l=web.35889085.8CBF76737397B87CC376C54A7477B2BA; logined=y; p20t=web.35889085.561FC1A2E3C075005BA22FA6AF94582D; aws-waf-token=3e11472b-921d-484a-87b9-9931a645c01e:BgoAp2CYjx8VAAAA:0mjygzQJu1aGrJBSz1cSf4V50A8ccYZY2C8bepP2Si/Rw6ClPVxzubNzV5SmKwd24cvzV1oEEciq34dOdzXD6HAIOqLZTEXjEGJign14qZno97VEw/CddFOS31hQj+JOLtLiIY+Hx9vWl6KToy9OEh8aZ8EDBKwvWhQLsE710rRI9JYf899WIxXUYLxKzIBP+ig=; _ga_3WP50LGEEC=deleted; _ga_3WP50LGEEC=deleted; BNC_FV_KEY_T=101-tS51oBg1X2IIbS1FYTDyPP3x5OEnMeBglsDRQKHyxgdXbp1DiG%2BRIW15xLqgLGoi0yhgKo7co5MP%2BP3WCaD3ig%3D%3D-8N1QW0AlVVNHqAHIBV1sHw%3D%3D-0a; BNC_FV_KEY_EXPIRE=1754687960898; _uetsid=19d43730721111f0ae1d033ffa8ee3ad; _uetvid=e5ff2c00332a11f08b2d2f437f6c050d; futures-layout=pro; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2235889085%22%2C%22first_id%22%3A%22196899c525912cc-0b45e1ccbad1ff8-19525636-4953600-196899c525a4e7a%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22internal%22%2C%22%24latest_utm_medium%22%3A%22homepage%22%2C%22%24latest_utm_campaign%22%3A%22trading_dashboard%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2ODk5YzUyNTkxMmNjLTBiNDVlMWNjYmFkMWZmOC0xOTUyNTYzNi00OTUzNjAwLTE5Njg5OWM1MjVhNGU3YSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6IjM1ODg5MDg1In0%3D%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%2235889085%22%7D%2C%22%24device_id%22%3A%2219689a1c4a0907-0e57b8a4a069a18-19525636-4953600-19689a1c4a13dbf%22%7D; _gat_UA-162512367-1=1; _ga=GA1.1.2096234808.1746065481; _ga_3WP50LGEEC=GS2.1.s1754675085$o43$g1$t1754684359$j10$l0$h0; OptanonConsent=isGpcEnabled=0&datestamp=Sat+Aug+09+2025+03%3A19%3A19+GMT%2B0700+(Indochina+Time)&version=202506.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=f648e87c-66c0-4aff-ac42-ba66cb9ab7a6&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0004%3A1%2CC0002%3A1&AwaitingReconsent=false&intType=1&geolocation=VN%3BSG",
      "Referer": "https://www.binance.com/en/square/fear-and-greed-index/"
    },
    "body": "{\"scene\":\"web\",\"isQueryFutureMarketGroup\":false}",
    "method": "POST"
  });
  const errorMessage = "Failed to fetch Fear & Greed Index data!";
  if (!res.ok) {
    console.error(errorMessage, res.statusText);
    return { error: errorMessage };
  }
  const data = await res.json();
  if (!data?.data?.fearGreed) {
    console.error('Không tìm thấy dữ liệu Fear & Greed Index!');
    return { error: errorMessage };
  }
  const fearGreed = data.data.fearGreed;
  const highestSearchedCoinPairList = data.data.highestSearchedCoinPairList.map(item => item.symbol);
  const futureMarket = data.data.futureMarket;
  const result = { fearGreed, highestSearchedCoinPairList, futureMarket };
  // console.log(result);

  fs.writeFileSync(
    path.resolve(__dirname, '../fearGreedHighestSearched.json'),
    JSON.stringify(result, null, 2),
    'utf8'
  );
  return result;
}
// fearGreedHighestSearched();

module.exports = { fearGreedHighestSearched };
