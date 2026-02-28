{
    "id": "ord_840796",
    "created": "2021-03-11T14:31:23.41Z",
    "lastUpdated": "2021-03-11T14:31:23.4931606Z",
    "callbackUrl": null,
    "merchantReference": "MyMerchantReference1",
    "shippingMethod": "Overnight",
    "idempotencyKey": null,
    "status": {
        "stage": "InProgress",
        "issues": [],
        "details": {
            "downloadAssets": "NotStarted",
            "printReadyAssetsPrepared": "NotStarted",
            "allocateProductionLocation": "NotStarted",
            "inProduction": "NotStarted",
            "shipping": "NotStarted"
        }
    },
    "charges": [],
    "shipments": [],
    "recipient": {
        "name": "Mr test",
        "email": null,
        "phoneNumber": null,
        "address": {
            "line1": "14 test place",
            "line2": "test",
            "postalOrZipCode": "12345",
            "countryCode": "US",
            "townOrCity": "somewhere",
            "stateOrCounty": null
        }
    },
    "branding": {
        "postcard": { "url" : "https://sample/postcard.jpg"},
        "flyer": { "url" : "https://sample/flyer.pdf"},
        "packing_slip_bw": { "url" : "https://sample/delivery_note_bw.jpg"},
        "packing_slip_color" : { "url" : "https://sample/delivery_note_color.jpg"},
        "sticker_exterior_round" : { "url" : "https://sample/sticker_round.jpg"},
        "sticker_exterior_rectangle"  :{ "url" : "https://sample/sticker_rect.jpg"},
        "sticker_interior_round" : { "url" : "https://sample/sticker_round.jpg"},
        "sticker_interior_rectangle": { "url" : "https://sample/sticker_rect.jpg"}
    },
    "items": [
        {
            "id": "ori_926886",
            "status": "NotYetDownloaded",
            "merchantReference": "item #1",
            "sku": "GLOBAL-CFPM-16X20",
            "copies": 1,
            "sizing": "fillPrintArea",
            "attributes": {
                "color": "black"
            },
            "assets": [
                {
                    "id": "ast_114059",
                    "printArea": "default",
                    "md5Hash": "daa1c811c6038e718a23f0d816914b7b",
                    "url": "https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png",
                    "pageCount": 50,
                    "status": "InProgress"
                }
            ],
            "recipientCost": {
                "amount": "10.74",
                "currency": "GBP"
            }
        }
    ],
    "packingSlip": null,
    "metadata": {
        "mycustomkey": "some-guid",
        "someCustomerPreference": {
            "preference1": "something",
            "preference2": "red"
        },
        "sourceId": 12345
    }
curl "https://api.sandbox.prodigi.com/v4.0/Orders" \
  -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '
    {
        "merchantReference": "MyMerchantReference1",
        "shippingMethod": "Overnight",
        "recipient": {
            "name": "Mr Testy McTestface",
            "address": {
                "line1": "14 test place",
                "line2": "test",
                "postalOrZipCode": "12345",
                "countryCode": "US",
                "townOrCity": "somewhere",
                "stateOrCounty": null
            }
        },
        "branding": {
            "postcard": { "url" : "https://sample/postcard.jpg"},
            "flyer": { "url" : "https://sample/flyer.pdf"},
            "packing_slip_bw": { "url" : "https://sample/delivery_note_bw.jpg"},
            "packing_slip_color" : { "url" : "https://sample/delivery_note_color.jpg"},
            "sticker_exterior_round" : { "url" : "https://sample/sticker_round.jpg"},
            "sticker_exterior_rectangle"  :{ "url" : "https://sample/sticker_rect.jpg"},
            "sticker_interior_round" : { "url" : "https://sample/sticker_round.jpg"},
            "sticker_interior_rectangle": { "url" : "https://sample/sticker_rect.jpg"}
        },
        "items": [
            {
                "merchantReference": "item #1",
                "sku": "GLOBAL-CFPM-16X20",
                "copies": 1,
                "sizing": "fillPrintArea",
                "attributes": {
                    "color": "black"
                },
                "recipientCost": {
                    "amount": "15.00",
                    "currency": "USD"
                },
                "assets": [
                    {
                        "printArea": "default",
                        "url": "https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png",
                        "md5Hash": "daa1c811c6038e718a23f0d816914b7b",
                        "pageCount": 50
                    }
                ]
            }
        ],
        "metadata": {
            "mycustomkey":"some-guid",
            "someCustomerPreference": {
                "preference1": "something",
                "preference2": "red"
            },
            "sourceId": 12345
        }
    }
  '
{
    "outcome": "Created",
    "order": {
        "id": "ord_840797",
        "created": "2021-03-11T14:40:05.12Z",
        "lastUpdated": "2021-03-11T14:40:05.2018442Z",
        "callbackUrl": null,
        "merchantReference": "MyMerchantReference1",
        "shippingMethod": "Overnight",
        "idempotencyKey": null,
        "status": {
            "stage": "InProgress",
            "issues": [],
            "details": {
                "downloadAssets": "NotStarted",
                "printReadyAssetsPrepared": "NotStarted",
                "allocateProductionLocation": "NotStarted",
                "inProduction": "NotStarted",
                "shipping": "NotStarted"
            }
        },
        "charges": [],
        "shipments": [],
        "recipient": {
            "name": "Mr Test",
            "email": null,
            "phoneNumber": null,
            "address": {
                "line1": "14 test place",
                "line2": "test",
                "postalOrZipCode": "12345",
                "countryCode": "US",
                "townOrCity": "somewhere",
                "stateOrCounty": null
            }
        },
        "branding": {
            "postcard": { "url" : "https://sample/postcard.jpg"},
            "flyer": { "url" : "https://sample/flyer.pdf"},
            "packing_slip_bw": { "url" : "https://sample/delivery_note_bw.jpg"},
            "packing_slip_color" : { "url" : "https://sample/delivery_note_color.jpg"},
            "sticker_exterior_round" : { "url" : "https://sample/sticker_round.jpg"},
            "sticker_exterior_rectangle"  :{ "url" : "https://sample/sticker_rect.jpg"},
            "sticker_interior_round" : { "url" : "https://sample/sticker_round.jpg"},
            "sticker_interior_rectangle": { "url" : "https://sample/sticker_rect.jpg"}
        },
        "items": [
            {
                "id": "ori_926887",
                "status": "NotYetDownloaded",
                "merchantReference": "item #1",
                "sku": "GLOBAL-CFPM-16X20",
                "copies": 1,
                "sizing": "fillPrintArea",
                "attributes": {
                    "color": "black"
                },
                "assets": [
                    {
                        "id": "ast_114059",
                        "printArea": "default",
                        "md5Hash": "daa1c811c6038e718a23f0d816914b7b",
                        "url": "https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png",
                        "status": "InProgress"
                    }
                ],
                "recipientCost": {
                    "amount": "10.74",
                    "currency": "GBP"
                }
            }
        ],
        "packingSlip": null,
        "metadata": {
            "mycustomkey": "some-guid",
            "someCustomerPreference": {
                "preference1": "something",
                "preference2": "red"
            },
            "sourceId": 12345
        }
    },
    "traceParent": "00-f68685c43545e048bc44d9bc8239d59a-967255597477ac40-00"
}
curl "https://api.sandbox.prodigi.com/v4.0/orders/ord_677258" \
  -X GET \
  -H "X-API-Key: your-api-key"
{
    "outcome": "Ok",
    "order": {
        "id": "ord_840797",
        "created": "2021-03-11T14:40:05.12Z",
        "lastUpdated": "2021-03-11T14:40:05.203Z",
        "callbackUrl": null,
        "merchantReference": "MyMerchantReference1",
        "shippingMethod": "Overnight",
        "idempotencyKey": null,
        "status": {
            "stage": "InProgress",
            "issues": [],
            "details": {
                "downloadAssets": "NotStarted",
                "printReadyAssetsPrepared": "NotStarted",
                "allocateProductionLocation": "NotStarted",
                "inProduction": "NotStarted",
                "shipping": "NotStarted"
            }
        },
        "charges": [],
        "shipments": [],
        "recipient": {
            "name": "Mr Test",
            "email": null,
            "phoneNumber": null,
            "address": {
                "line1": "14 test place",
                "line2": "test",
                "postalOrZipCode": "12345",
                "countryCode": "US",
                "townOrCity": "somewhere",
                "stateOrCounty": null
            }
        },
        "items": [
            {
                "id": "ori_926887",
                "status": "NotYetDownloaded",
                "merchantReference": "item #1",
                "sku": "GLOBAL-CFPM-16X20",
                "copies": 1,
                "sizing": "fillPrintArea",
                "attributes": {
                    "color": "black"
                },
                "assets": [
                    {
                        "id": "ast_114059",
                        "printArea": "default",
                        "md5Hash": "daa1c811c6038e718a23f0d816914b7b",
                        "url": "https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png",
                        "pageCount": 50,
                        "status": "InProgress"
                    }
                ],
                "recipientCost": {
                    "amount": "10.74",
                    "currency": "GBP"
                }
            }
        ],
        "packingSlip": null,
        "metadata": {
            "mycustomkey": "some-guid",
            "someCustomerPreference": {
                "preference1": "something",
                "preference2": "red"
            },
            "sourceId": 12345
        }
    },
    "traceParent": "00-ef2d62064c7b224690a9578e84f4c617-150bbac7b6406e46-00"
}
curl "https://api.sandbox.prodigi.com/v4.0/orders" \
  -X GET \
  -H "X-API-Key: your-api-key"

{
    "outcome": "Ok",
    "orders": [
        {
            "id": "ord_840797",
            // rest of the order
        },
        {
            "id": "ord_839555",
            // rest of the order
        },
        {
            "id": "ord_838659",
            // rest of the order
        },
        {
            "id": "ord_838055",
            // rest of the order
        }
    ],
    "hasMore": true,
    "nextUrl": "https://api.sandbox.prodigi.com/v4.0/Orders?Skip=10",
    "traceParent": "00-cb879e84d8c70a45b5742d34be5f3a6d-4535bc8797a33c49-00"
}
curl "https://api.sandbox.prodigi.com/v4.0/Orders/ord_123456/actions" \
  -X GET \
  -H "X-API-Key: your-api-key"
{
    "outcome": "Ok",
    "cancel": {
        "isAvailable": "Yes"
    },
    "changeRecipientDetails": {
        "isAvailable": "Yes"
    },
    "changeShippingMethod": {
        "isAvailable": "Yes"
    },
    "changeMetaData": {
        "isAvailable": "Yes"
    },
    "traceParent": "00-e5bcd15ebc235043bf43b6fb209de64e-72320d4625a34a40-00"
}
curl "https://api.sandbox.prodigi.com/v4.0/orders/ord_123456/actions/cancel" \
  -X POST \
  -H "X-API-Key: your-api-key"
{
    "outcome": "Cancelled",
    "order": {
        "id": "ord_840797",
        "created": "2021-03-11T14:40:05.12Z",
        "lastUpdated": "2021-03-11T15:04:08.0923435Z",
        "callbackUrl": null,
        "merchantReference": "MyMerchantReference1",
        "shippingMethod": "Overnight",
        "idempotencyKey": null,
        "status": {
            "stage": "Cancelled",
            "issues": [],
            "details": {
                "downloadAssets": "NotStarted",
                "printReadyAssetsPrepared": "NotStarted",
                "allocateProductionLocation": "NotStarted",
                "inProduction": "NotStarted",
                "shipping": "NotStarted"
            }
        },
        "charges": [],
        "shipments": [],
        "recipient": {
            "name": "Mr Test",
            "email": null,
            "phoneNumber": null,
            "address": {
                "line1": "14 test place",
                "line2": "test",
                "postalOrZipCode": "12345",
                "countryCode": "US",
                "townOrCity": "somewhere",
                "stateOrCounty": null
            }
        },
        "items": [
            {
                "id": "ori_926887",
                "status": "NotYetDownloaded",
                "merchantReference": "item #1",
                "sku": "GLOBAL-CFPM-16X20",
                "copies": 1,
                "sizing": "fillPrintArea",
                "attributes": {
                    "color": "black"
                },
                "assets": [
                    {
                        "id": "ast_114059",
                        "printArea": "default",
                        "md5Hash": "daa1c811c6038e718a23f0d816914b7b",
                        "url": "https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png",
                        "status": "InProgress"
                    }
                ],
                "recipientCost": {
                    "amount": "10.74",
                    "currency": "GBP"
                }
            }
        ],
        "packingSlip": null,
        "metadata": {
            "mycustomkey": "some-guid",
            "someCustomerPreference": {
                "preference1": "something",
                "preference2": "red"
            },
            "sourceId": 12345
        }
    },
    "traceParent": "00-fd6711a9793bd648b0f83300e73dcd10-0eefc6d035357d42-00"
}
curl "https://api.sandbox.prodigi.com/v4.0/Orders/ord_123456/actions/updateShippingMethod" \
  -X POST \
  -H "X-API-Key: your-api-key" \
  -d '{ "shippingMethod": "Budget" }'
{
    "outcome": "Updated",
    "shippingUpdateResults": [],
    "order": {
        "id": "ord_840799",
        "created": "2021-03-11T15:06:40.697Z",
        "lastUpdated": "2021-03-11T15:06:46.2816154Z",
        "callbackUrl": null,
        "merchantReference": "MyMerchantReference1",
        "shippingMethod": "Express",
        "idempotencyKey": null,
        "status": {
            "stage": "InProgress",
            "issues": [],
            "details": {
                "downloadAssets": "NotStarted",
                "printReadyAssetsPrepared": "NotStarted",
                "allocateProductionLocation": "NotStarted",
                "inProduction": "NotStarted",
                "shipping": "NotStarted"
            }
        },
        "charges": [],
        "shipments": [],
        "recipient": {
            "name": "Mr Testy McTestface",
            "email": null,
            "phoneNumber": null,
            "address": {
                "line1": "14 test place",
                "line2": "test",
                "postalOrZipCode": "12345",
                "countryCode": "US",
                "townOrCity": "somewhere",
                "stateOrCounty": null
            }
        },
        "items": [
            {
                "id": "ori_926889",
                "status": "NotYetDownloaded",
                "merchantReference": "item #1",
                "sku": "GLOBAL-CFPM-16X20",
                "copies": 1,
                "sizing": "fillPrintArea",
                "attributes": {
                    "color": "black"
                },
                "assets": [
                    {
                        "id": "ast_114059",
                        "printArea": "default",
                        "md5Hash": "daa1c811c6038e718a23f0d816914b7b",
                        "url": "https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png",
                        "status": "InProgress"
                    }
                ],
                "recipientCost": {
                    "amount": "10.74",
                    "currency": "GBP"
                }
            }
        ],
        "packingSlip": null,
        "metadata": {
            "mycustomkey": "some-guid",
            "someCustomerPreference": {
                "preference1": "something",
                "preference2": "red"
            },
            "sourceId": 12345
        }
    },
    "traceParent": "00-a80b88df69bd0e45a923cc4d9f858978-5eaad925e38cd348-00"
}
curl "https://api.sandbox.prodigi.com/v4.0/Orders/ord_123456/actions/updateRecipient" \
  -X POST \
  -H "X-API-Key: your-api-key" \
  -d '{
        "name": "Mr. Jeff Testing",
        "email": "jeff.testing@test.co.uk",
        "phoneNumber": "123456780",
        "address" : {
                      "line1": "14 test place",
                      "line2": "test",
                      "postalOrZipCode": "12345",
                      "countryCode": "US",
                      "townOrCity": "MyTown",
                      "stateOrCounty": null
                    }
      }'
{
    "outcome": "Updated",
    "shipmentUpdateResults": [],
    "order": {
        "id": "ord_840799",
        "recipient": {
            "name": "Mr. Jeff Testing",
            "email": "jeff.testing@test.co.uk",
            "phoneNumber": "123456780",
            "address": {
                "line1": "14 test place",
                "line2": "test",
                "postalOrZipCode": "12345",
                "countryCode": "US",
                "townOrCity": "MyTown",
                "stateOrCounty": null
            }
        },
        // rest of the order
    },
    "traceParent": "00-e3466ad67db82340aa97a337e5c9ea91-edb742f49fc22c46-00"
}
curl "https://api.sandbox.prodigi.com/v4.0/Orders/ord_123456/actions/updateMetadata" \
  -X POST \
  -H "X-API-Key: your-api-key" \
  -d '{ 
        "metadata" : { 
            "internalRef" : "abdef",
            "templateSize" : 1,
            "feedback" : {
                "message": "some message",
                "stars": 5
            }
        }
      }'
{
    "outcome": "Updated",
    "order": {
        "id": "ord_840799",
        "created": "2021-03-11T15:06:40.697Z",
        "lastUpdated": "2021-03-11T15:14:28.9200361Z",
        "callbackUrl": null,
        "merchantReference": "MyMerchantReference1",
        "shippingMethod": "Express",
        "idempotencyKey": null,
        "status": {
            "stage": "InProgress",
            "issues": [],
            "details": {
                "downloadAssets": "NotStarted",
                "printReadyAssetsPrepared": "NotStarted",
                "allocateProductionLocation": "NotStarted",
                "inProduction": "NotStarted",
                "shipping": "NotStarted"
            }
        },
        "charges": [],
        "shipments": [],
        "recipient": {
            "name": "Mr Test",
            "email": null,
            "phoneNumber": null,
            "address": {
                "line1": "14 test place",
                "line2": "test",
                "postalOrZipCode": "12345",
                "countryCode": "US",
                "townOrCity": "somewhere",
                "stateOrCounty": null
            }
        },
        "items": [
            {
                "id": "ori_926889",
                "status": "NotYetDownloaded",
                "merchantReference": "item #1",
                "sku": "GLOBAL-CFPM-16X20",
                "copies": 1,
                "sizing": "fillPrintArea",
                "attributes": {
                    "color": "black"
                },
                "assets": [
                    {
                        "id": "ast_114059",
                        "printArea": "default",
                        "md5Hash": "daa1c811c6038e718a23f0d816914b7b",
                        "url": "https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png",
                        "status": "InProgress"
                    }
                ],
                "recipientCost": {
                    "amount": "10.74",
                    "currency": "GBP"
                }
            }
        ],
        "packingSlip": null,
        "metadata": {
            "internalRef": "abdef",
            "templateSize": 1,
            "feedback": {
                "message": "some message",
                "stars": 5
            }
        }
    },
    "traceParent": "00-0229c7d0a6e3814b98806af95599c00d-c6ba62fadb84e346-00"
}
{
    "outcome": "Ok",
    "quotes": [
        {
            "shipmentMethod": "Budget",
            "costSummary": {
                "items": {
                    "amount": "7.50",
                    "currency": "GBP"
                },
                "shipping": {
                    "amount": "1.50",
                    "currency": "GBP"
                }
            },
            "shipments": [
                {
                    "carrier": {
                        "name": "royalmail",
                        "service": "Standard"
                    },
                    "fulfillmentLocation": {
                        "countryCode": "GB",
                        "labCode": "uk6"
                    },
                    "cost": {
                        "amount": "1.50",
                        "currency": "GBP"
                    },
                    "items": [
                        "qit_cf79d209cf3e40ff8a56861f50d8937a"
                    ]
                }
            ],
            "items": [
                {
                    "id": "qit_cf79d209cf3e40ff8a56861f50d8937a",
                    "sku": "GLOBAL-TECH-IP11P-FC-CP",
                    "copies": 1,
                    "unitCost": {
                        "amount": "7.50",
                        "currency": "GBP"
                    },
                    "attributes": {},
                    "assets": [
                        {
                            "printArea": "default"
                        }
                    ]
                }
            ]
        }
    ]
}
curl "https://api.sandbox.prodigi.com/v4.0/quotes" \
  -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '
    {
        "shippingMethod": "Budget",
        "destinationCountryCode": "GB",
        "currencyCode":"GBP",
        "items": [
            {
                "sku": "GLOBAL-CAN-10x10",
                "copies": 5,
                "attributes": { "wrap":"ImageWrap" },
                "assets" : [
                    { "printArea" : "default" }
                ]
            },
            {
                "sku": "GLOBAL-FAP-10x10",
                "copies": 1,
                "attributes": { },
                "assets" : [
                    { "printArea" : "default" }
                ]
            }
        ]
    }
  '
{
    "outcome": "Created",
    "quotes": [
        {
            "shipmentMethod": "Budget",
            "costSummary": {
                "items": {
                    "amount": "79.35",
                    "currency": "GBP"
                },
                "shipping": {
                    "amount": "19.46",
                    "currency": "GBP"
                }
            },
            "shipments": [
                {
                    "carrier": {
                        "name": "Mixed",
                        "service": "Mixed"
                    },
                    "fulfillmentLocation": {
                        "countryCode": "US",
                        "labCode": "us11"
                    },
                    "cost": {
                        "amount": "17.96",
                        "currency": "GBP"
                    },
                    "items": [
                        "qit_f1c1f62b8fd0486da831c9438e89bc25"
                    ]
                },
                {
                    "carrier": {
                        "name": "royalmail",
                        "service": "Standard"
                    },
                    "fulfillmentLocation": {
                        "countryCode": "GB",
                        "labCode": "uk6"
                    },
                    "cost": {
                        "amount": "1.50",
                        "currency": "GBP"
                    },
                    "items": [
                        "qit_a904222e1c964440870f3400bd2d5973"
                    ]
                }
            ],
            "items": [
                {
                    "id": "qit_f1c1f62b8fd0486da831c9438e89bc25",
                    "sku": "GLOBAL-CAN-10X10",
                    "copies": 5,
                    "unitCost": {
                        "amount": "14.37",
                        "currency": "GBP"
                    },
                    "attributes": {
                        "wrap": "ImageWrap"
                    },
                    "assets": [
                        {
                            "printArea": "default"
                        }
                    ]
                },
                {
                    "id": "qit_a904222e1c964440870f3400bd2d5973",
                    "sku": "GLOBAL-TECH-IP11P-FC-CP",
                    "copies": 1,
                    "unitCost": {
                        "amount": "7.50",
                        "currency": "GBP"
                    },
                    "attributes": {},
                    "assets": [
                        {
                            "printArea": "default"
                        }
                    ]
                }
            ]
        }
    ]
}
{
    "sku": "GLOBAL-CAN-10X10",
    "description": "Standard canvas on quality stretcher bar, 25x25cm",
    "productDimensions": {
        "width": 10.0000,
        "height": 10.0000,
        "units": "in"
    },
    "attributes": {
        "wrap": [
            "Black",
            "ImageWrap",
            "MirrorWrap",
            "White"
        ]
    },
    "printAreas": {
        "default": {
            "required": true
        }
    },
    "variants": [
        {
            "attributes": {
                "wrap": "Black"
            },
            "shipsTo": [
                "IM",
                "LU",
                "ID",
                "CI",
                "GR",
                "FK",
                "AL",
                "LA",
                "KY"
            ],
            "printAreaSizes": {
                "default": {
                    "horizontalResolution": 1522,
                    "verticalResolution": 1522
                }
            }
        },
        {
            "attributes": {
                "wrap": "ImageWrap"
            },
            "shipsTo": [
                "IM",
                "LU",
                "ID",
                "CI",
                "GR",
                "FK",
                "AL",
                "LA",
                "KY"
            ],
            "printAreaSizes": {
                "default": {
                    "horizontalResolution": 2137,
                    "verticalResolution": 2137
                }
            }
        },
        {
            "attributes": {
                "wrap": "MirrorWrap"
            },
            "shipsTo": [
                "IM",
                "LU",
                "ID",
                "CI",
                "GR",
                "FK",
                "AL",
                "LA",
                "KY"
            ],
            "printAreaSizes": {
                "default": {
                    "horizontalResolution": 1522,
                    "verticalResolution": 1522
                }
            }
        },
        {
            "attributes": {
                "wrap": "White"
            },
            "shipsTo": [
                "IM",
                "LU",
                "ID",
                "CI",
                "GR",
                "FK",
                "AL",
                "LA",
                "KY"
            ],
            "printAreaSizes": {
                "default": {
                    "horizontalResolution": 1522,
                    "verticalResolution": 1522
                }
            }
        }
    ]
}
curl "https://api.sandbox.prodigi.com/v4.0/products/GLOBAL-CAN-10x10" \
  -X GET \
  -H "X-API-Key: your-api-key"
{
    "outcome": "Ok",
    "product": {
        "sku": "GLOBAL-CAN-10X10",
        "description": "Standard canvas on quality stretcher bar, 25x25cm",
        "productDimensions": {
            "width": 10.0000,
            "height": 10.0000,
            "units": "in"
        },
        "attributes": {
            "wrap": [
                "Black",
                "ImageWrap",
                "MirrorWrap",
                "White"
            ]
        },
        "printAreas": {
            "default": {
                "required": true
            }
        },
        "variants": [
            {
                "attributes": {
                    "wrap": "Black"
                },
                "shipsTo": [
                    "IM",
                    "LU",
                    "ID",
                    "CI",
                    "GR",
                    "FK",
                    "AL",
                    "LA",
                    "KY"
                ],
                "printAreaSizes": {
                    "default": {
                        "horizontalResolution": 1522,
                        "verticalResolution": 1522
                    }
                }
            },
            {
                "attributes": {
                    "wrap": "ImageWrap"
                },
                "shipsTo": [
                    "IM",
                    "LU",
                    "ID",
                    "CI",
                    "GR",
                    "FK",
                    "AL",
                    "LA",
                    "KY"
                ],
                "printAreaSizes": {
                    "default": {
                        "horizontalResolution": 2137,
                        "verticalResolution": 2137
                    }
                }
            },
            {
                "attributes": {
                    "wrap": "MirrorWrap"
                },
                "shipsTo": [
                    "IM",
                    "LU",
                    "ID",
                    "CI",
                    "GR",
                    "FK",
                    "AL",
                    "LA",
                    "KY"
                ],
                "printAreaSizes": {
                    "default": {
                        "horizontalResolution": 1522,
                        "verticalResolution": 1522
                    }
                }
            },
            {
                "attributes": {
                    "wrap": "White"
                },
                "shipsTo": [
                    "IM",
                    "LU",
                    "ID",
                    "CI",
                    "GR",
                    "FK",
                    "AL",
                    "LA",
                    "KY"
                ],
                "printAreaSizes": {
                    "default": {
                        "horizontalResolution": 1522,
                        "verticalResolution": 1522
                    }
                }
            }
        ]
    }
}
curl "https://api.prodigi.com/v4.0/products/spine" \
  -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '
    {
        "sku": "BOOK-A4-L-HARD-M",
        "destinationCountryCode": "US",
        "state": "CA",
        "numberOfPages": 50
    }
{
    "success": true,
    "message": "Spine info retrieved (or appropriate error message)",
    "spineInfo": {
        "widthMm": 25.4
    }
}
{
    "specversion": "1.0",
    "type": "com.prodigi.order.status.stage.changed#InProgress",
    "source": "http://api.prodigi.com/v4.0/Orders/",
    "id": "evt_305174",
    "time": "2020-08-14T11:51:01.55Z",
    "datacontenttype": "application/json",
    "data": {
      "order": {
        "id": "ord_1469466",
        "created": "2020-08-14T11:50:54.557Z",
        "status": {
          "stage": "InProgress",
          "issues": [],
          "details": {
            "downloadAssets": "InProgress",
            "printReadyAssetsPrepared": "NotStarted",
            "allocateProductionLocation": "NotStarted",
            "inProduction": "NotStarted",
            "shipping": "NotStarted"
          }
        },
        "charges": [],
        "shipments": [],
        "merchantReference": "1",
        "shippingMethod": "Budget",
        "recipient": {
          "name": "Pwinty Test Order",
          "address": {
            "line1": "123 Test Street",
            "line2": "TESTERTON",
            "postalOrZipCode": "TE5 7IN",
            "countryCode": "US",
            "townOrCity": "TEST CITY",
            "stateOrCounty": "TESTSHIRE"
          },
          "email": "mike.hole@prodigi.com",
          "mobilePhoneNumber": "07987654321"
        },
        "items": [
          {
            "id": "ori_1430070",
            "status": "NotYetDownloaded",
            "sku": "GLOBAL-PHO-12X16-PRO-LUS-UK1",
            "copies": 1,
            "sizing": "fillPrintArea",
            "attributes": {},
            "assets": [
              {
                "id": "ast_116447",
                "status": "InProgress",
                "printArea": "default",
                "url": "https://pwintytest.blob.core.windows.net/sample-media/mike/TestCard.png"
              }
            ],
            "recipientCost": {
              "amount": "543.21",
              "currency": "USD"
            }
          }
        ],
        "packingSlip": {
          "url": "https://pwintytest.blob.core.windows.net/sample-media/mike/PackingSlip.png",
          "status": "NotYetDownloaded"
        }
      }
    },
    "subject": "ord_1469466"
  }
 "data": {
      "id": "ord_1469466",
      "created": "2020-08-14T11:50:54.557Z",
      "status": {
        "stage": "InProgress"
      }
 }
{
    "outcome": "Created",
    "order": {
        "id": "ord_840796",
        "created": "2021-03-11T14:31:23.41Z",
        "lastUpdated": "2021-03-11T14:31:23.4931606Z",
        "callbackUrl": null,
        "merchantReference": "MyMerchantReference1",
        "shippingMethod": "Overnight",
        "idempotencyKey": null,
        "status": {
            "stage": "InProgress",
            "issues": [],
            "details": {
                "downloadAssets": "NotStarted",
                "printReadyAssetsPrepared": "NotStarted",
                "allocateProductionLocation": "NotStarted",
                "inProduction": "NotStarted",
                "shipping": "NotStarted"
            }
        },
        "charges": [],
        "shipments": [],
        "recipient": {
            "name": "Mr test",
            "email": null,
            "phoneNumber": null,
            "address": {
                "line1": "14 test place",
                "line2": "test",
                "postalOrZipCode": "12345",
                "countryCode": "US",
                "townOrCity": "somewhere",
                "stateOrCounty": null
            }
        },
        "items": [
            {
                "id": "ori_926886",
                "status": "NotYetDownloaded",
                "merchantReference": "item #1",
                "sku": "GLOBAL-CFPM-16X20",
                "copies": 1,
                "sizing": "fillPrintArea",
                "attributes": {
                    "color": "black"
                },
                "assets": [
                    {
                        "id": "ast_114059",
                        "printArea": "default",
                        "md5Hash": "daa1c811c6038e718a23f0d816914b7b",
                        "url": "https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png",
                        "status": "InProgress"
                    }
                ],
                "recipientCost": {
                    "amount": "10.74",
                    "currency": "GBP"
                }
            }
        ],
        "packingSlip": null,
        "metadata": {
            "mycustomkey": "some-guid",
            "someCustomerPreference": {
                "preference1": "something",
                "preference2": "red"
            },
            "sourceId": 12345
        }
    },
    "traceParent": "00-65e25206c6b1e34dbdcea1a7051f85bd-f6885faf442b6041-00"
}
{
    "stage":"InProgress",
    "details" : {
        "downloadAssets":"InProgress",
        "printReadyAssetsPrepared":"NotStarted",
        "allocateProductionLocation ": "NotStarted",
        "inProduction":"NotStarted",
        "shipping":"NotStarted"
    },
    "issues":[
        {
            "objectId": "ori_12345",
            "errorCode" : "items.assets.NotDownloaded",
            "description" : "Warning: Download attempt 1 of 10 failed for 'default' asset on item 'ori_12345' at location 'http://source.url' "
        },
        {
            "objectId": "ord_829398",
            "errorCode": "RequiresPaymentAuthorisation",
            "description": "Payment authorisation required for 'ord_829398' (195.02USD) please use the following URL to make payment: https://beta-dashboard.pwinty.com/payment/97323",
            "authorisationDetails": {
                "authorisationUrl": "https://beta-dashboard.pwinty.com/payment/97323",
                "paymentDetails": {
                    "amount": "195.02",
                    "currency": "USD"
                }
            }
        }
    ]
}
{
    "statusText": "Something went wrong",
    "statusCode": 400,
    "data": {
    },
    "traceParent": "00-2c42dcf1952d634ab2d5d1ab49e8bdf9-c20ae99b6e950049-00"
}


The order process
Understanding how we process and fulfill orders will help you understand our API.

Our order process consists of the following steps:

Order creation
Assets download
Lab allocation
Asset preparation
Lab submission
Production
Shipping
Order completion
During the order's lifecycle, we can send you callbacks with information on how the order is progressing. We can send callbacks when the following events occur:

After the "Create order" stage
After the "Shipments made" stage
After the "Order completed" stage
1. Order creation
The order is created by POSTing to the /orders endpoint. Once any pre-configured pause window has expired, it moves into fulfilment.

Order stage: In progress
Callback available: no
Task	Stage
Download assets	Not started
Print-ready assets prepared	Not started
Allocate production location	Not started
In production	Not started
Shipping	Not started
2. Assets download
We download your assets from your source URIs. We ensure that they are available for processing, and are available should the order need to be resubmitted or checked for quality.

For details of how long we keep the original and transformed images see image retention below.

Order stage: In progress
Callback available: yes, once complete
Task	Stage
Download assets	In progress
Allocate production location	Not started
Print-ready assets prepared	Not started
In production	Not started
Shipping	Not started
3. Lab allocation
When allocating your order, we allocate to the most cost-effective lab based on the chosen products, destination and shipping method. This may require us to split the order into multiple shipments.

Once this process has been completed, the order that is returned by the API shows the allocated shipments for the order items.

Order stage: In progress
Callback available: no
Task	Stage
Download assets	Complete
Allocate production location	In progress
Print-ready assets prepared	Not started
In production	Not started
Shipping	Not started
4. Asset preparation
We prepare each image asset file according to the requirements of the ordered product/lab (e.g. format or orientation).

Order stage: In progress
Callback available: no
Task	Stage
Download assets	Complete
Allocate production location	Completed
Print-ready assets prepared	In progress
In production	Not started
Shipping	Not started
5. Lab submission
Each shipment is sent to their respective lab.

Order stage: In progress
Callback available: no
Task	Stage
Download assets	Complete
Allocate production location	Completed
Print-ready assets prepared	Complete
In production	In progress
Shipping	Not started
6. Production
Each lab prints the items that they have been allocated.

Order stage: In progress
Callback available: no
Task	Stage
Download assets	Completed
Print-ready assets prepared	Completed
Allocate production location	Completed
In production	In progress
Shipping	Not started
7. Shipping
Once the items are produced, each lab notifies us and provides details of the shipment, including the specific shipping method used and the shipping reference where available.

Order stage: In progress
Callback available: yes, once complete
Task	Stage
Download assets	Completed
Print-ready assets prepared	Completed
Allocate production location	Completed
In production	In progress
Shipping	In progress
8. Order completion
When all items have received a shipping notification the whole order is marked as complete.

Order stage: Complete
Callback available: Yes
Task	Stage
Download assets	Complete
Print-ready assets prepared	Complete
Allocate production location	Complete
In production	Complete
Shipping	Complete
Image retention
When an order is submitted, we immediately save copies of the order's image assets. We retain these for 30 days, after which they are deleted automatically.

This 30-day period is in case we need to resubmit your order at any point, for example to a different lab.

