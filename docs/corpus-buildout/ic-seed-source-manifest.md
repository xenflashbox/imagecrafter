# ImageCrafter corpus seed/source manifest

Property: `ic`
Prepared: 2026-10-12
Purpose: handoff artifact for the BlogCraft backend admin ingest harness.

This is **not evidence** and it is **not chunk text**. Each row is a seed plus an official
starting URL to crawl, resolve, quote, classify, embed and write into the `ic` schema. The
ingest run must still obey `00-CORPUS-SYSTEM-CONTRACT.md`: extract quoted passages only,
never synthesize `chunk_text`, and record rejected sources in `research_exclusions`.

Seed count: **130**
Split: **45 art_style**, **50 animal**, **35 print_medium**

## Art Style Seeds

| # | canonical seed | tier | source_start_url | target_entity | target_chunk_type |
|---:|---|---|---|---|---|
| 1 | Baroque | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=baroque&logic=AND&note=&page=1 | art_style | period_attribution |
| 2 | Renaissance | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=renaissance&logic=AND&note=&page=1 | art_style | period_attribution |
| 3 | High Renaissance | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=high+renaissance&logic=AND&note=&page=1 | art_style | period_attribution |
| 4 | Northern Renaissance | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=northern+renaissance&logic=AND&note=&page=1 | art_style | period_attribution |
| 5 | Dutch Golden Age | museum_or_archive | https://www.rijksmuseum.nl/en/search?q=Dutch%20Golden%20Age | art_style | named_work_reference |
| 6 | Rococo | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=rococo&logic=AND&note=&page=1 | art_style | period_attribution |
| 7 | Neoclassicism | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=neoclassicism&logic=AND&note=&page=1 | art_style | period_attribution |
| 8 | Romanticism | museum_or_archive | https://www.tate.org.uk/search?q=Romanticism | art_style | period_attribution |
| 9 | Realism | museum_or_archive | https://www.tate.org.uk/search?q=Realism | art_style | period_attribution |
| 10 | Impressionism | museum_or_archive | https://www.metmuseum.org/art/collection/search?q=Impressionism&showOnly=openAccess | art_style | named_work_reference |
| 11 | Post-Impressionism | museum_or_archive | https://www.tate.org.uk/search?q=Post-Impressionism | art_style | period_attribution |
| 12 | Pre-Raphaelite | museum_or_archive | https://www.tate.org.uk/search?q=Pre-Raphaelite | art_style | period_attribution |
| 13 | Victorian portraiture | museum_or_archive | https://www.npg.org.uk/collections/search?search=Victorian%20portrait | art_style | named_work_reference |
| 14 | Regency portraiture | museum_or_archive | https://www.npg.org.uk/collections/search?search=Regency%20portrait | art_style | named_work_reference |
| 15 | Tudor portraiture | museum_or_archive | https://www.npg.org.uk/collections/search?search=Tudor%20portrait | art_style | named_work_reference |
| 16 | Elizabethan portraiture | museum_or_archive | https://www.npg.org.uk/collections/search?search=Elizabethan%20portrait | art_style | named_work_reference |
| 17 | Art Nouveau | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=art+nouveau&logic=AND&note=&page=1 | art_style | period_attribution |
| 18 | Art Deco | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=art+deco&logic=AND&note=&page=1 | art_style | period_attribution |
| 19 | Pop Art | museum_or_archive | https://www.tate.org.uk/search?q=Pop%20Art | art_style | period_attribution |
| 20 | Modernism | museum_or_archive | https://www.tate.org.uk/search?q=Modernism | art_style | period_attribution |
| 21 | Expressionism | museum_or_archive | https://www.tate.org.uk/search?q=Expressionism | art_style | period_attribution |
| 22 | Cubism | museum_or_archive | https://www.tate.org.uk/search?q=Cubism | art_style | period_attribution |
| 23 | Fauvism | museum_or_archive | https://www.tate.org.uk/search?q=Fauvism | art_style | period_attribution |
| 24 | Symbolism | museum_or_archive | https://www.tate.org.uk/search?q=Symbolism | art_style | period_attribution |
| 25 | Chiaroscuro | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=chiaroscuro&logic=AND&note=&page=1 | art_style | technique_description |
| 26 | Tenebrism | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=tenebrism&logic=AND&note=&page=1 | art_style | technique_description |
| 27 | Impasto | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=impasto&logic=AND&note=&page=1 | art_style | technique_description |
| 28 | Glazing | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=glazing&logic=AND&note=&page=1 | art_style | technique_description |
| 29 | Grisaille | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=grisaille&logic=AND&note=&page=1 | art_style | technique_description |
| 30 | Sfumato | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=sfumato&logic=AND&note=&page=1 | art_style | technique_description |
| 31 | Oil on canvas | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=oil+on+canvas&logic=AND&note=&page=1 | art_style | technique_description |
| 32 | Oil on panel | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=oil+on+panel&logic=AND&note=&page=1 | art_style | technique_description |
| 33 | Court portrait | museum_or_archive | https://www.npg.org.uk/collections/search?search=court%20portrait | art_style | costume_or_regalia_fact |
| 34 | Equestrian portrait | museum_or_archive | https://www.metmuseum.org/art/collection/search?q=equestrian%20portrait&showOnly=openAccess | art_style | named_work_reference |
| 35 | Three-quarter pose | museum_or_archive | https://www.npg.org.uk/collections/search?search=three-quarter%20portrait | art_style | style_convention |
| 36 | Lace collar | museum_or_archive | https://www.metmuseum.org/art/collection/search?q=lace%20collar%20portrait&showOnly=openAccess | art_style | costume_or_regalia_fact |
| 37 | Ruff collar | museum_or_archive | https://www.npg.org.uk/collections/search?search=ruff%20collar | art_style | costume_or_regalia_fact |
| 38 | Ermine robe | museum_or_archive | https://www.rct.uk/collection/search#/page/1?search=ermine%20robe%20portrait | art_style | costume_or_regalia_fact |
| 39 | Laurel wreath | museum_or_archive | https://www.metmuseum.org/art/collection/search?q=laurel%20wreath%20portrait&showOnly=openAccess | art_style | costume_or_regalia_fact |
| 40 | Pearl earring portrait convention | museum_or_archive | https://www.mauritshuis.nl/en/our-collection/artworks/670-girl-with-a-pearl-earring-johannes-vermeer/ | art_style | named_work_reference |
| 41 | Gold leaf ornament | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=gold+leaf&logic=AND&note=&page=1 | art_style | technique_description |
| 42 | Ultramarine pigment | museum_or_archive | https://www.getty.edu/vow/AATServlet?find=ultramarine&logic=AND&note=&page=1 | art_style | technique_description |
| 43 | Black ground portrait | museum_or_archive | https://www.metmuseum.org/art/collection/search?q=black%20background%20portrait&showOnly=openAccess | art_style | style_convention |
| 44 | Old Master portrait | museum_or_archive | https://www.nationalgallery.org.uk/search?q=portrait%20old%20master | art_style | art_historical_correction |
| 45 | Salon portrait | museum_or_archive | https://www.metmuseum.org/art/collection/search?q=salon%20portrait&showOnly=openAccess | art_style | style_convention |

## Animal Seeds

| # | canonical seed | tier | source_start_url | target_entity | target_chunk_type |
|---:|---|---|---|---|---|
| 46 | Dog | veterinary_body | https://www.avma.org/resources-tools/pet-owners/petcare/dogs | animal | welfare_guidance |
| 47 | Cat | veterinary_body | https://catvets.com/guidelines/ | animal | veterinary_position |
| 48 | Labrador Retriever | veterinary_body | https://www.akc.org/dog-breeds/labrador-retriever/ | animal | breed_standard |
| 49 | Golden Retriever | veterinary_body | https://www.akc.org/dog-breeds/golden-retriever/ | animal | breed_standard |
| 50 | German Shepherd Dog | veterinary_body | https://www.akc.org/dog-breeds/german-shepherd-dog/ | animal | breed_standard |
| 51 | French Bulldog | veterinary_body | https://www.akc.org/dog-breeds/french-bulldog/ | animal | breed_standard |
| 52 | Bulldog | veterinary_body | https://www.akc.org/dog-breeds/bulldog/ | animal | breed_standard |
| 53 | Poodle | veterinary_body | https://www.akc.org/dog-breeds/poodle-standard/ | animal | breed_standard |
| 54 | Beagle | veterinary_body | https://www.akc.org/dog-breeds/beagle/ | animal | breed_standard |
| 55 | Dachshund | veterinary_body | https://www.akc.org/dog-breeds/dachshund/ | animal | breed_standard |
| 56 | Boxer | veterinary_body | https://www.akc.org/dog-breeds/boxer/ | animal | breed_standard |
| 57 | Rottweiler | veterinary_body | https://www.akc.org/dog-breeds/rottweiler/ | animal | breed_standard |
| 58 | Yorkshire Terrier | veterinary_body | https://www.akc.org/dog-breeds/yorkshire-terrier/ | animal | breed_standard |
| 59 | Cavalier King Charles Spaniel | veterinary_body | https://www.akc.org/dog-breeds/cavalier-king-charles-spaniel/ | animal | breed_standard |
| 60 | Border Collie | veterinary_body | https://www.akc.org/dog-breeds/border-collie/ | animal | breed_standard |
| 61 | Australian Shepherd | veterinary_body | https://www.akc.org/dog-breeds/australian-shepherd/ | animal | breed_standard |
| 62 | Shih Tzu | veterinary_body | https://www.akc.org/dog-breeds/shih-tzu/ | animal | breed_standard |
| 63 | Pomeranian | veterinary_body | https://www.akc.org/dog-breeds/pomeranian/ | animal | breed_standard |
| 64 | Chihuahua | veterinary_body | https://www.akc.org/dog-breeds/chihuahua/ | animal | breed_standard |
| 65 | Great Dane | veterinary_body | https://www.akc.org/dog-breeds/great-dane/ | animal | breed_standard |
| 66 | Siberian Husky | veterinary_body | https://www.akc.org/dog-breeds/siberian-husky/ | animal | breed_standard |
| 67 | Pembroke Welsh Corgi | veterinary_body | https://www.akc.org/dog-breeds/pembroke-welsh-corgi/ | animal | breed_standard |
| 68 | Boston Terrier | veterinary_body | https://www.akc.org/dog-breeds/boston-terrier/ | animal | breed_standard |
| 69 | Doberman Pinscher | veterinary_body | https://www.akc.org/dog-breeds/doberman-pinscher/ | animal | breed_standard |
| 70 | Australian Cattle Dog | veterinary_body | https://www.akc.org/dog-breeds/australian-cattle-dog/ | animal | breed_standard |
| 71 | Pug | veterinary_body | https://www.akc.org/dog-breeds/pug/ | animal | breed_standard |
| 72 | Persian cat | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 73 | Maine Coon | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 74 | Siamese cat | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 75 | Ragdoll | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 76 | Bengal cat | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 77 | Sphynx | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 78 | British Shorthair | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 79 | Abyssinian | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 80 | Russian Blue | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 81 | Burmese cat | veterinary_body | https://tica.org/breeds/browse-all-breeds | animal | breed_standard |
| 82 | Feline vision | peer_reviewed | https://pubmed.ncbi.nlm.nih.gov/?term=feline+vision+flicker+fusion | animal | cognition_study |
| 83 | Canine vision | peer_reviewed | https://pubmed.ncbi.nlm.nih.gov/?term=dog+vision+dichromatic+acuity | animal | cognition_study |
| 84 | Cat television perception | peer_reviewed | https://pubmed.ncbi.nlm.nih.gov/?term=cat+vision+television+flicker+fusion | animal | uncertainty_note |
| 85 | Dog attachment secure-base | peer_reviewed | https://pubmed.ncbi.nlm.nih.gov/?term=dog+attachment+secure+base+owner | animal | cognition_study |
| 86 | Cat attachment secure-base | peer_reviewed | https://pubmed.ncbi.nlm.nih.gov/?term=cat+attachment+secure+base+owner | animal | cognition_study |
| 87 | Dog olfactory recognition | peer_reviewed | https://pubmed.ncbi.nlm.nih.gov/?term=dog+olfactory+recognition+owner | animal | behaviour_finding |
| 88 | Cat owner recognition | peer_reviewed | https://pubmed.ncbi.nlm.nih.gov/?term=cat+owner+recognition+voice | animal | behaviour_finding |
| 89 | Animal emotion limits | peer_reviewed | https://pubmed.ncbi.nlm.nih.gov/?term=domestic+animal+emotion+cognition+limitations | animal | uncertainty_note |
| 90 | Companion-animal welfare | veterinary_body | https://avsab.org/resources/position-statements/ | animal | veterinary_position |
| 91 | Positive reinforcement training | veterinary_body | https://avsab.org/resources/position-statements/ | animal | welfare_guidance |
| 92 | Puppy socialization | veterinary_body | https://avsab.org/resources/position-statements/ | animal | welfare_guidance |
| 93 | Cat environmental needs | veterinary_body | https://catvets.com/guidelines/ | animal | welfare_guidance |
| 94 | Horse portrait anatomy | veterinary_body | https://www.merckvetmanual.com/horse-owners | animal | anatomy_fact |
| 95 | Rabbit portrait anatomy | veterinary_body | https://www.merckvetmanual.com/exotic-and-laboratory-animals/rabbits | animal | anatomy_fact |

## Print Medium Seeds

| # | canonical seed | tier | source_start_url | target_entity | target_chunk_type |
|---:|---|---|---|---|---|
| 96 | Fine-art paper | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art | print_medium | substrate_spec |
| 97 | Enhanced uncoated 200gsm paper | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art | print_medium | substrate_spec |
| 98 | Stretched canvas | manufacturer_spec | https://product.gelato.com/en-US/catalog/canvas | print_medium | substrate_spec |
| 99 | Framed canvas | manufacturer_spec | https://product.gelato.com/en-US/catalog/framed-canvas | print_medium | framing_or_mounting_spec |
| 100 | Framed fine-art print | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art-framed-poster | print_medium | framing_or_mounting_spec |
| 101 | Plexiglass glazing | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art-framed-poster | print_medium | framing_or_mounting_spec |
| 102 | Black aluminum frame | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art-framed-poster | print_medium | framing_or_mounting_spec |
| 103 | Black wood canvas frame | manufacturer_spec | https://product.gelato.com/en-US/catalog/framed-canvas | print_medium | framing_or_mounting_spec |
| 104 | FSC wood stretcher | manufacturer_spec | https://product.gelato.com/en-US/catalog/canvas | print_medium | framing_or_mounting_spec |
| 105 | 12mm slim canvas profile | manufacturer_spec | https://product.gelato.com/en-US/catalog/canvas | print_medium | size_or_format_standard |
| 106 | Pigment ink | manufacturer_spec | https://www.epson.com/For-Work/Printers/Large-Format/Epson-UltraChrome-PRO12-Ink/c/w320 | print_medium | ink_or_pigment_spec |
| 107 | Archival pigment print | standards_body | https://www.wilhelm-research.com/ | print_medium | archival_rating |
| 108 | ISO 18902 imaging materials | standards_body | https://www.iso.org/standard/57999.html | print_medium | archival_rating |
| 109 | ISO 18909 processed photographic films | standards_body | https://www.iso.org/search.html?q=ISO%2018909 | print_medium | archival_rating |
| 110 | ICC profile | standards_body | https://www.color.org/iccprofile.xalter | print_medium | colour_management_fact |
| 111 | sRGB color space | standards_body | https://www.color.org/srgb.xalter | print_medium | colour_management_fact |
| 112 | Adobe RGB workflow | standards_body | https://www.color.org/registry/index.xalter | print_medium | colour_management_fact |
| 113 | Soft proofing | standards_body | https://www.color.org/faqs.xalter | print_medium | colour_management_fact |
| 114 | Optical brightening agents | manufacturer_spec | https://www.hahnemuehle.com/en/digital-fineart/fineart-media.html | print_medium | substrate_spec |
| 115 | Acid-free paper | manufacturer_spec | https://www.hahnemuehle.com/en/digital-fineart/fineart-media.html | print_medium | archival_rating |
| 116 | Cotton rag paper | manufacturer_spec | https://www.hahnemuehle.com/en/digital-fineart/fineart-media.html | print_medium | substrate_spec |
| 117 | Alpha-cellulose paper | manufacturer_spec | https://www.hahnemuehle.com/en/digital-fineart/fineart-media.html | print_medium | substrate_spec |
| 118 | Hahnemuhle Photo Rag | manufacturer_spec | https://www.hahnemuehle.com/en/digital-fineart/fineart-media/matt-fineart-smooth/p/Product/show/8/3.html | print_medium | substrate_spec |
| 119 | Hahnemuhle German Etching | manufacturer_spec | https://www.hahnemuehle.com/en/digital-fineart/fineart-media/matt-fineart-textured/p/Product/show/12/5.html | print_medium | substrate_spec |
| 120 | Canson Rag Photographique | manufacturer_spec | https://www.canson-infinity.com/en/products/canson-infinity-rag-photographique | print_medium | substrate_spec |
| 121 | Canson Platine Fibre Rag | manufacturer_spec | https://www.canson-infinity.com/en/products/canson-infinity-platine-fibre-rag | print_medium | substrate_spec |
| 122 | Epson Legacy Platine | manufacturer_spec | https://epson.com/For-Work/Paper/Photo-and-Fine-Art/Epson-Legacy-Platine-Paper/m/S450079 | print_medium | substrate_spec |
| 123 | Epson Hot Press Bright | manufacturer_spec | https://epson.com/For-Work/Paper/Photo-and-Fine-Art/Epson-Hot-Press-Bright-Paper/m/S042327 | print_medium | substrate_spec |
| 124 | Canvas care | manufacturer_spec | https://product.gelato.com/en-US/catalog/canvas | print_medium | care_instruction |
| 125 | Framed print care | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art-framed-poster | print_medium | care_instruction |
| 126 | 8x10 inch print format | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art | print_medium | size_or_format_standard |
| 127 | 12x16 inch print format | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art | print_medium | size_or_format_standard |
| 128 | 16x20 inch print format | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art | print_medium | size_or_format_standard |
| 129 | 24x36 inch print format | manufacturer_spec | https://product.gelato.com/en-US/catalog/fine-art | print_medium | size_or_format_standard |
| 130 | Lightfastness testing | standards_body | https://www.wilhelm-research.com/ | print_medium | archival_rating |

## Suggested Initial Exclusions

These are not counted in the 130 seeds. Add them to `ic.research_exclusions` during ingest
when encountered.

| entity | source pattern | reason |
|---|---|---|
| art_style | AI portrait generator vendor style guides | style_claim_from_vendor_not_museum |
| art_style | competitor pet portrait shops | competitor_or_self_marketing |
| animal | pet-owner testimonials about emotion/cognition | no_primary_support |
| animal | generic pet blogs/listicles for cognition claims | no_primary_support |
| print_medium | vendor marketing pages saying "archival" without a measurable rating | unmeasured_product_claim |
| all | ImageCrafter's own blog articles | self_citation |
