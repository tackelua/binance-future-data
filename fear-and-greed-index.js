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
      "device-info": "eyJzY3JlZW5fcmVzb2x1dGlvbiI6IjM0NDAsMTQ0MCIsImF2YWlsYWJsZV9zY3JlZW5fcmVzb2x1dGlvbiI6IjMzODAsMTQxNSIsInN5c3RlbV92ZXJzaW9uIjoiTWFjIE9TIDEwLjE1LjciLCJicmFuZF9tb2RlbCI6InVua25vd24iLCJzeXN0ZW1fbGFuZyI6ImVuLVVTIiwidGltZXpvbmUiOiJHTVQrMDc6MDAiLCJ0aW1lem9uZU9mZnNldCI6LTQyMCwidXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChNYWNpbnRvc2g7IEludGVsIE1hYyBPUyBYIDEwXzE1XzcpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMzguMC4wLjAgU2FmYXJpLzUzNy4zNiIsImxpc3RfcGx1Z2luIjoiUERGIFZpZXdlcixDaHJvbWUgUERGIFZpZXdlcixDaHJvbWl1bSBQREYgVmlld2VyLE1pY3Jvc29mdCBFZGdlIFBERiBWaWV3ZXIsV2ViS2l0IGJ1aWx0LWluIFBERiIsImNhbnZhc19jb2RlIjoiN2FiNDVmZTEiLCJ3ZWJnbF92ZW5kb3IiOiJHb29nbGUgSW5jLiAoQXBwbGUpIiwid2ViZ2xfcmVuZGVyZXIiOiJBTkdMRSAoQXBwbGUsIEFOR0xFIE1ldGFsIFJlbmRlcmVyOiBBcHBsZSBNNCwgVW5zcGVjaWZpZWQgVmVyc2lvbikiLCJhdWRpbyI6IjEyNC4wNDM0ODE1NTg3NjUwNSIsInBsYXRmb3JtIjoiTWFjSW50ZWwiLCJ3ZWJfdGltZXpvbmUiOiJBc2lhL1NhaWdvbiIsImRldmljZV9uYW1lIjoiQ2hyb21lIFYxMzguMC4wLjAgKE1hYyBPUykiLCJmaW5nZXJwcmludCI6IjgzN2Q4ZjAzYThhZjljNjM2ZTE3NmI3MGY0NjNlNGFjIiwiZGV2aWNlX2lkIjoiIiwicmVsYXRlZF9kZXZpY2VfaWRzIjoiIn0=",
      "fvideo-id": "337f2d16ef5ba317bc830deb35efe59faf0e1340",
      "fvideo-token": "5it7PikI8NWDWeY8XRp7svzO6aEtiCPqUrGioWFtkbAZDFPfaHVN8AC761Fx53JQe5je+YDCsqeQIwammuTnSeRRGTgcohBbO7bN1kgRsKB6+iJmnij5N78Npb2CqlKmtq07KSjh5tt37t38hKbjVwBbyYDAf3YaO7aR8IOgLg0XxsV/eXKrwzJ5WLw8utCag=44",
      "lang": "en",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-passthrough-token": "",
      "x-trace-id": "96606004-355c-4af5-839f-1282f0c74f0b",
      "x-ui-request-trace": "96606004-355c-4af5-839f-1282f0c74f0b",
      "cookie": "bnc-uuid=be978f8b-5b11-4f74-ad24-dde2b865f94b; BNC_FV_KEY=337f2d16ef5ba317bc830deb35efe59faf0e1340; userPreferredCurrency=USD_USD; language=en; se_gd=xUWCQThpQRPCRIFxQFVYgZZVACQcABXWlMBJcVUBldUVQGVNWVUW1; se_gsd=SjMlPztxNjIiCRIyITU3GjYyUVUOAgpbVlpLVVFWV1dSM1NT1; OptanonAlertBoxClosed=2025-05-01T02:11:19.593Z; BNC-Location=VN; lang=en; changeBasisTimeZone=; g_state={\"i_l\":0}; _gcl_au=1.1.1463854681.1747491979; theme=dark; neo-theme=dark; se_sd=gVRUAQAsHQFU1QGEEEQwgZZERARQXEUVFBTBaUkR1VVVQElNWVtS1; currentAccount=; isAccountsLoggedIn=y; _gid=GA1.2.1468648975.1754257420; s9r1=E7378E9483F38D8445B60C02B6EB3B45; r20t=web.E0319BC6CCE3AD43735EEC7B1EF43208; r30t=1; cr00=FAC140C2808911B0CA9C47CB293E4B73; d1og=web.35889085.04BDB4DCA0F8E45594924CA28770F3A2; r2o1=web.35889085.89D2BF10A8EB5142983996F4CFAA325D; f30l=web.35889085.8CBF76737397B87CC376C54A7477B2BA; logined=y; p20t=web.35889085.561FC1A2E3C075005BA22FA6AF94582D; aws-waf-token=3e11472b-921d-484a-87b9-9931a645c01e:BgoAp2CYjx8VAAAA:0mjygzQJu1aGrJBSz1cSf4V50A8ccYZY2C8bepP2Si/Rw6ClPVxzubNzV5SmKwd24cvzV1oEEciq34dOdzXD6HAIOqLZTEXjEGJign14qZno97VEw/CddFOS31hQj+JOLtLiIY+Hx9vWl6KToy9OEh8aZ8EDBKwvWhQLsE710rRI9JYf899WIxXUYLxKzIBP+ig=; _ga_3WP50LGEEC=deleted; _ga_3WP50LGEEC=deleted; janus_token=d2acsf7lg7uc739mkvig; _uetsid=19d43730721111f0ae1d033ffa8ee3ad; _uetvid=e5ff2c00332a11f08b2d2f437f6c050d; BNC_FV_KEY_T=101-XaQTYCaXAITr8XCYvkthivPx7SIKqnTHrrEo84b8N3XhQQfeLFBoqBeJbWkKHLwM%2F5tX0T9WiSWEF0hYBT8Ntg%3D%3D-AhL9oPGd0dd03T8M%2BcBzEw%3D%3D-5a; BNC_FV_KEY_EXPIRE=1754612818365; futures-layout=pro; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2235889085%22%2C%22first_id%22%3A%22196899c525912cc-0b45e1ccbad1ff8-19525636-4953600-196899c525a4e7a%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22%24latest_utm_source%22%3A%22internal%22%2C%22%24latest_utm_medium%22%3A%22homepage%22%2C%22%24latest_utm_campaign%22%3A%22trading_dashboard%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTk2ODk5YzUyNTkxMmNjLTBiNDVlMWNjYmFkMWZmOC0xOTUyNTYzNi00OTUzNjAwLTE5Njg5OWM1MjVhNGU3YSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6IjM1ODg5MDg1In0%3D%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%2235889085%22%7D%2C%22%24device_id%22%3A%2219689a1c4a0907-0e57b8a4a069a18-19525636-4953600-19689a1c4a13dbf%22%7D; _gat_UA-162512367-1=1; _ga_3WP50LGEEC=GS2.1.s1754600580$o39$g1$t1754600671$j60$l0$h0; _ga=GA1.1.2096234808.1746065481; OptanonConsent=isGpcEnabled=0&datestamp=Fri+Aug+08+2025+04%3A04%3A35+GMT%2B0700+(Indochina+Time)&version=202506.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=f648e87c-66c0-4aff-ac42-ba66cb9ab7a6&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0004%3A1%2CC0002%3A1&AwaitingReconsent=false&intType=1&geolocation=VN%3BSG",
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
    path.resolve(__dirname, 'fearGreedHighestSearched.json'),
    JSON.stringify(result, null, 2),
    'utf8'
  );
  return result;
}
// fearGreedHighestSearched();

module.exports = { fearGreedHighestSearched };
