# SA-KNOWLEDGE — Sanne Andersen Vidensbank Vurdering

> Vurdering af LLM Wiki-patternen som fundament for den AI-drevne vidensbank og chat-guide
> der skal drive sanneandersen.dk's digitale klinik.

**Dato:** 2026-04-13
**Kontekst:** WebHouse pitch "Sanne Andersen — Digital Univers" + 6 faglige kildefiler fra Dansk Institut for Zoneterapi
**Vurdering af:** Christian Broberg & Claude (Opus 4.6)

---

## 1. Baggrund

### Pitchen
WebHouse har pitchet en ny digital platform for Sanne Andersen — zoneterapeut, sygeplejerske, psykoterapeut, healer, chi gong-instruktør og direktør for Dansk Institut for Zoneterapi (difzt.dk) i Aalborg. 25 års klinisk erfaring, PhD i klient-transformation, 7 behandlingsformer.

Platformen skal samle tre separate websites (sanneandersen.dk, difzt.dk, goldenwingschigong.dk) til ét digitalt univers med:
- AI-guide der leder klienter til rette behandling
- RAG-vidensbank med blog og artikler
- Online booking 24/7
- Kursusplatform for zoneterapeutuddannelsen
- Digitale gavekort
- Native app (iOS/Android)

### Nøgleformulering fra pitchen
> "Ét website. Alt indhold. Én AI der ved alt. Behandlinger, kurser, chi gong-hold, blog og FAQ samlet på ét sted. AI-assistenten kender hele dit univers."

### Spørgsmålet
Kan Karpathys LLM Wiki-pattern erstatte traditionel RAG som motor bag Sannes vidensbank og AI-guide? Og er det tilgængelige kildemateriale tilstrækkeligt til en vurdering?

---

## 2. Kildemateriale — Analyse

6 filer fra `lidttilvoresrack.zip`, alle fra Dansk Institut for Zoneterapi:

### 2.1 Kort og godt om Biopati og Naturopati (25 sider, PDF)
**Type:** Faglig grundbog
**Indhold:** Komplet introduktion til biopati/naturopati som Sanne praktiserer den. Dækker:
- Sundhed og sygdom som dynamisk balance (homøostase)
- 5 kategorier af belastende faktorer: psykiske, fysiske, kemiske, mikrobiologiske, konstitutionelle
- Det mikrobiologiske faseforløb: Balance → Alarmfase → Akut dysbiose → Kronisk dysbiose → Depotdannelse → Ukontrolleret cellevækst
- Stressgrader 1-4 med symptombeskrivelser og progressionsmønstre
- Familiehistorik og genetisk disposition
- Regeneration og kroppens selvhelbredelse
- Kostterapi: proteiner, fedtsyrer (omega 3/6/9), vitaminer, mineraler
- Regulerings-, immun- og symbioseterapi
- Toksiner (ekso-, endo-, autotoksiner)

**Vurdering:** Dette er Sannes faglige fundament. Ekstremt videnrigt, velstruktureret, og ideelt til wiki-kompilering. Indholdet er relationelt i sin natur — stressgrader linker til organsystemer, som linker til kostråd, som linker til behandlingsformer.

### 2.2 Hjernen lyste op som et juletræ — Neurovidenskab og zoneterapi (5 sider, PDF)
**Type:** Forskningsformidling
**Indhold:** Rapport om Kevin Kunz og Dr. Stefan Posses fMRI-forskningsprojekt "Neural Pathways of Applied Reflexology" (publiceret maj 2024). Nøglefund:
- Zoneterapi aktiverer hjerneområder langt ud over den sensorisk-motoriske cortex
- Insula cortex ("bevidsthedens sæde") aktiveret hos alle deltagere
- Supramarginale gyrus (forbindelse krop-sind) konstant aktiv
- Temporale gyrus aktiveret hos slagtilfælde-patienter
- Hjernen "lyste op som et juletræ" under fMRI hos apopleksipatienter
- Begrænsninger: lille stikprøve (8 forsøgspersoner), on-off blokmønster nødvendig for fMRI

**Vurdering:** Stærkt materiale til AI-guiden — giver videnskabeligt fundament bag zoneterapi. Vigtig for troværdighed. Skal præsenteres med forskningens egne forbehold.

### 2.3 Udrensningssystemet (10+ slides, PDF/præsentation)
**Type:** Undervisningsslides fra difzt.dk
**Indhold:** Anatomisk gennemgang af kroppens udrensningsorganer:
- Nyrer (renes): filtrering, væske/salt-balance, 180L/døgn
- Lunger: O2/CO2 udveksling, 80-120m² overflade, respirationsmuskulatur
- Lever (hepar): depot, afgiftning, galdedannelse, hormon-nedbrydning
- Milt (lien): lymfatisk organ, destruktion af blodlegemer
- Tyktarm: 120cm, mucin-dannelse, 70% af immunforsvaret
- Hud: kroppens største organ
- Zone-kort: mapping af organer til fodzoner (16 zoner identificeret)
- De 5 elementer (TKM): Ild, Jord, Metal, Vand, Træ med Sheng-cyklus

**Vurdering:** Perfekt til strukturerede wiki-sider per organ. Zone-mappingen er unik domæneviden der er ideel til AI-retrieval: "hvilken zone behandler leveren?" → Zone 12.

### 2.4 De helbredende urter (10+ sider, PDF)
**Type:** Opslagsværk/håndbog
**Indhold:** Alfabetisk katalog over 30+ medicinske urter med:
- Dansk navn og latinsk navn
- Anvendelse og virkninger
- Dosering og tilberedning (te, omslag, udtræk)
- Fotos af hver urte

Eksempler: Agermåne (antibiotisk), Baldrian (søvnstimulerende, nerveberoligende), Brændenælde (gigt, blodrensende), Citronmelisse (feber, migræne), Fennikel (slimløsende).

**Vurdering:** Højstruktureret data der er perfekt til wiki-sider. Hver urte bliver en selvstændig side med cross-refs til organer og lidelser. AI'en kan svare: "hvilke urter hjælper mod søvnproblemer?" ved at trække fra kompilerede wiki-sider, ikke fragmenterede chunks.

### 2.5 Urter til div. zoneterapi-systemer (.doc)
**Type:** Intern reference
**Indhold:** Urter kategoriseret per organsystem til zoneterapi-behandling.

**Vurdering:** Nøgle-mapping mellem urter og behandlingssystemer. Cross-referencing-guld.

### 2.6 Ordforklaring til Urteteer (.docx)
**Type:** Terminologi-guide
**Indhold:** Forklaring af fagtermer inden for urtebehandling.

**Vurdering:** Vigtigt for AI-guiden — sikrer at fagtermer kan forklares i et tilgængeligt sprog.

---

## 3. Vurdering: LLM Wiki vs. Traditionel RAG

### 3.1 Hvorfor traditionel RAG er et dårligt fit

Traditionel RAG (chunk → embed → retrieve → generate) har fundamentale svagheder for Sannes vidensunivers:

**Chunking ødelægger kontekst.** Når "Kort og godt om Biopati" chunkes i 512-token fragmenter, rives stressgrad 3's symptombeskrivelse væk fra stressgrad 2's kontekst. Faseforløbet fra balance til depotdannelse splittes over 6 chunks. AI'en må rekonstruere sammenhængen fra scratch ved hvert spørgsmål.

**Relationer er usynlige.** Sannes viden er et netværk: stressgrader → organpåvirkning → urter → zone-behandling → kostterapi → faseforløb. RAG ser kun tekstlighed (embedding-afstand), ikke faglige relationer. "Baldrian er nerveberoligende" og "stressgrad 2 påvirker nervesystemet" har svag embedding-lighed, men stærk faglig relation.

**Ingen syntese.** En klient spørger: "Jeg er stresset, sover dårligt og har maveproblemer." RAG finder 5 chunks — måske noget om stress, måske noget om mave. Men den syntetiserer ikke: dette lyder som stressgrad 2-3, tarmfloraen er sandsynligvis påvirket (akut dysbiose), zoneterapi kan aktivere insula cortex (afslapning), baldrian-te til søvn, kostterapi med fokus på tarmflora.

**Ingen kompounding.** Hver gang en ny artikel eller fagbog tilføjes, chunkes den isoleret. Ingen opdatering af eksisterende viden, ingen krydstjek mod eksisterende claims.

### 3.2 Hvorfor LLM Wiki er det rigtige fit

**Vidensnetværk, ikke tekstfragmenter.** Wiki-sider for hvert koncept med eksplicitte links: `stressgrader.md` → linker til `faseforloeb.md`, `urter/baldrian.md`, `behandlinger/zoneterapi.md`, `kostterapi.md`. AI'en navigerer et struktureret vidensunivers.

**Kompilering ved ingest, ikke ved query.** Når Sanne tilføjer en ny artikel om f.eks. øreakupunktur mod rygestop, kompilerer LLM'en den ind i wiki'en: opdaterer `behandlinger/oereakupunktur.md`, tilføjer cross-refs til relevante lidelser, opdaterer overview. Viden akkumuleres.

**Syntese er prækompileret.** Wiki-siderne indeholder allerede syntesen. Siden om stressgrad 3 beskriver ikke bare symptomer — den linker allerede til relevante behandlinger, urter og kostråd. AI-guiden skal bare navigere, ikke rekonstruere.

**Modsigelser fanges.** Lint-cyklussen tjekker for inkonsistens mellem wiki-sider. Hvis en ny kilde modsiger en eksisterende claim om en urtes anvendelse, flages det.

**Sannes stemme bevares.** Wiki-siderne kompileres fra Sannes egne tekster. Hendes holistiske menneskesyn — "krop, psyke og energi hænger uløseligt sammen" — gennemsyrer wiki'en. RAG-chunks har ingen stemme.

### 3.3 Sammenligning

| Dimension | Traditionel RAG | LLM Wiki |
|---|---|---|
| Vidensmodel | Flat tekstfragmenter | Struktureret netværk med cross-refs |
| Ingest | Chunk + embed (mekanisk) | Kompilér + integrer + krydstjek (intelligent) |
| Query | Retrieve chunks → generate | Navigér wiki → syntetisér fra kompileret viden |
| Relationer | Implicit (embedding-afstand) | Eksplicit ([[links]], kategorier, tags) |
| Vedligeholdelse | Ingen (chunks rådner) | Lint-cyklus opdaterer og renser |
| Modsigelser | Usynlige | Flagges ved ingest og lint |
| Skalering | 10K-1M dokumenter | 10-1.000 kilder, 100-10.000 wiki-sider |
| Best fit | Bred, uforudsigelig søgning | Dybt, domænespecifikt vidensunivers |

---

## 4. Foreslået Wiki-Arkitektur for Sanne

```
sanne-wiki/
├── overview.md                          # Sannes behandlingsunivers — hovedside
├── log.md                               # Ingest/query/lint historik
│
├── concepts/                            # Faglige koncepter
│   ├── biopati-og-naturopati.md         # Overordnet filosofi og tilgang
│   ├── homoeastase.md                   # Kroppens dynamiske balance
│   ├── belastende-faktorer.md           # 5 kategorier med eksempler
│   ├── mikrobiologisk-faseforloeb.md    # Balance → depot (6 faser)
│   ├── stressgrader.md                  # Grad 1-4, symptomer, progression
│   ├── dysbiose.md                      # Akut og kronisk
│   ├── regeneration.md                  # Kroppens selvhelbredelse
│   ├── de-5-elementer-tkm.md            # Ild/Jord/Metal/Vand/Træ + Sheng
│   ├── toksiner.md                      # Ekso-, endo-, autotoksiner
│   ├── konstitution-og-genetik.md       # Familiemønstre og disposition
│   └── familiehistorik.md               # Diagnostisk værktøj
│
├── behandlinger/                        # 7 behandlingsformer
│   ├── zoneterapi.md                    # + zoner, neurovidenskab, indikationer
│   ├── oereakupunktur.md                # Fransk + kinesisk metode
│   ├── healing.md                       # Energibaseret behandling
│   ├── chi-massage.md                   # Kropsbehandling
│   ├── chi-gong-og-tai-chi.md           # Golden Wings metoden
│   ├── psykoterapi.md                   # Individuel terapi og coaching
│   ├── reguleringsbehandling.md         # Terapeutisk regulering
│   ├── kostterapi.md                    # Ernæring som behandling
│   └── immun-og-symbioseterapi.md       # Tarmflora-genopbygning
│
├── urter/                               # 30+ urtesider
│   ├── _index.md                        # Alfabetisk oversigt + søgetabel
│   ├── agermåne.md                      # Agrimonia eupatoria — antibiotisk
│   ├── baldrian.md                      # Valeriana officinalis — søvn, nerver
│   ├── braendenælde.md                  # Urtica dioica — gigt, blodrensende
│   ├── citronmelisse.md                 # Melissa officinalis — feber, migræne
│   ├── fennikel.md                      # Foeniculum vulgare — slimløsende
│   └── ...                              # Alle urter fra "De helbredende urter"
│
├── organer/                             # Anatomisk reference
│   ├── nyrer.md                         # Funktion + zone + urter + kost
│   ├── lever.md                         # Depot, afgiftning + zone 12
│   ├── lunger.md                        # Respiration + zone 9
│   ├── milt.md                          # Lymfatisk + zone 6
│   ├── tyktarm.md                       # Immunforsvar + zone 14
│   ├── hud.md                           # Udrensning via hud
│   └── hjerne.md                        # Insula cortex, supramarginal gyrus
│
├── zoner/                               # Zoneterapi-specifik
│   ├── zone-kort.md                     # Oversigt over alle 16 udrensningszoner
│   ├── urter-per-system.md              # Urter mappet til organsystemer
│   └── de-5-elementer-zoner.md          # TKM-elementer mappet til zoner
│
├── forskning/                           # Videnskabeligt fundament
│   └── fmri-zoneterapi-kunz-2024.md     # Neural Pathways of Applied Reflexology
│
├── kost/                                # Ernæringsviden
│   ├── generelle-kostregler.md          # Sundhedsstyrelsens anbefalinger + SA
│   ├── proteiner.md                     # Kilder, mængder, timing
│   ├── fedtsyrer.md                     # Omega 3/6/9, mættede vs. umættede
│   ├── vitaminer-og-mineraler.md        # Funktioner og mangler
│   └── vand-og-vaeske.md               # 2-3 liter dagligt
│
├── lidelser/                            # Symptom → behandling mapping
│   ├── stress.md                        # → stressgrader, zone, urter, kost
│   ├── soevnproblemer.md                # → baldrian, chi gong, stressreduktion
│   ├── fordoejelse.md                   # → dysbiose, tarmflora, kostterapi
│   ├── smerter.md                       # → zoneterapi, brændenælde, akupunktur
│   ├── allergi.md                       # → dysbiose, immunterapi, kostterapi
│   └── udbraendthed.md                  # → stressgrad 3-4, regeneration
│
└── entities/
    ├── sanne-andersen.md                # Baggrund, kvalifikationer, filosofi
    ├── dansk-institut-for-zoneterapi.md # difzt.dk, uddannelse, historie
    ├── kevin-kunz.md                    # Zoneterapeut og forsker
    ├── dr-stefan-posse.md               # Fysiker og fMRI-forsker
    ├── kurt-nielsen.md                  # Biopatiens grundlægger i DK
    └── golden-wings-chi-gong.md         # Chi gong center
```

### Estimat
- **Kilder (start):** 6 dokumenter (~80 sider tekst + billeder)
- **Wiki-sider (efter initial ingest):** ~60-80 sider
- **Wiki-sider (med 50+ kilder):** ~300-500 sider
- **Skaleringsgrænse for LLM Wiki:** ~10.000 sider (langt ud over behov)

---

## 5. AI-Guide: Hvordan det virker i praksis

### Scenarie 1: Symptom-guide
**Klient:** "Jeg har hovedpine, er træt hele tiden og sover dårligt"

**AI-guidens process (bag kulisserne):**
1. Søger wiki for: hovedpine, træthed, søvnproblemer
2. Finder `lidelser/stress.md` → linker til `concepts/stressgrader.md`
3. Matcher symptombillede med stressgrad 2 ("det autonome nervesystem begynder at røre på sig, dårligt humør, ondt i maven, koncentrationsbesvær")
4. Finder relevante behandlinger via cross-refs:
   - `behandlinger/zoneterapi.md` (aktiverer insula cortex → afslapning)
   - `urter/baldrian.md` (nerveberoligende, søvnstimulerende)
   - `urter/citronmelisse.md` (mod migræne, hjertestyrkende, beroligende)
   - `kost/generelle-kostregler.md` (blodsukker-stabilisering)
5. Syntetiserer svar med Sannes stemme og faglige tilgang

**AI-guidens svar:**
> Det du beskriver — vedvarende hovedpine, træthed og søvnproblemer — kan være tegn på at din krop er under belastning fra flere faktorer samtidig. I biopatien kalder vi det en tilstand hvor stressbelastningen begynder at overskride din reguleringskapacitet.
>
> **Hvad kan du selv gøre:**
> - Baldrian-te (1 teskefuld tørret rod til 1 kop kogende vand, 3-4 gange dagligt) kan hjælpe med søvnen og virker nerveberoligende
> - Citronmelisse er god mod hovedpine og har en beroligende virkning
> - Stabiliser dit blodsukker med regelmæssige måltider med gode kulhydrater og protein
>
> **Hvad Sanne kan hjælpe med:**
> Zoneterapi kan aktivere dybe hjerneområder der regulerer stress og afslapning — nyere forskning viser at behandlingen påvirker insula cortex, som er knyttet til kroppens følelsesmæssige tilstand. En konsultation ville også kortlægge dine belastende faktorer.
>
> [Book en tid →]

### Scenarie 2: Faglig forespørgsel
**Klient (eller studerende):** "Hvilke urter er gode til blære- og nyrelidelser?"

**AI-guidens process:**
1. Søger wiki: urter + blære + nyrer
2. Finder `organer/nyrer.md` → cross-refs til urter
3. Finder i `urter/_index.md` alle urter tagget med blære/nyre-system
4. Finder i `zoner/urter-per-system.md` den specifikke mapping

**AI-guidens svar:**
> Til blære- og nyrelidelser anbefaler vi følgende urter:
>
> - **Basilikum** (Ocimum basilikum) — fordøjelsesfremmende, påvirker blære og nyrer. 1-2 teskefulde tørret te, 3-4 gange dagligt.
> - **Dværgløvefod** (Aphanes arvensis) — bruges mod urinvejssygdomme og blærebetændelse.
> - **Burresnerre** (Galium aparine) — vanddrivende, anvendelig til urinvejssygdomme.
> - **Agerpadderokke** (Equisetum arvense) — mod blæresygdomme, virker urindrivende.
>
> Zoneterapi kan understøtte ved at arbejde med zone 1 (nyre), zone 2 (urinleder) og zone 3 (urinblære).
>
> *Bemærk: Disse oplysninger erstatter ikke lægelig rådgivning. Ved vedvarende symptomer bør du konsultere din læge.*

### Scenarie 3: Kursus-kontekst
**Studerende:** "Forklar de 5 elementer i TKM og deres relation til udrensningssystemet"

**AI-guidens process:**
1. Finder `concepts/de-5-elementer-tkm.md`
2. Cross-ref til `zoner/de-5-elementer-zoner.md`
3. Cross-ref til individuelle organ-sider

**Svar:** Komplet forklaring af Sheng-cyklus med organ-mappinger — præcis den type syntese RAG aldrig ville klare fra chunked slides.

---

## 6. Implementering — Roadmap

### Fase 1: Foundation (med nuværende LLM Wiki codebase)
- [ ] Opret dedicated wiki: "Sanne Andersen — Behandlingsunivers"
- [ ] Upload de 6 kildefiler som sources
- [ ] Kør ingest-cyklus → generer 60-80 wiki-sider
- [ ] Sanne reviewer og korrigerer wiki-sider
- [ ] Lint-cyklus for at fange gaps og manglende cross-refs

### Fase 2: Vidensudvidelse
- [ ] Tilføj Sannes blogindlæg og artikler som kilder
- [ ] Tilføj kursusindhold fra difzt.dk
- [ ] Tilføj chi gong-beskrivelser fra Golden Wings
- [ ] Ingest alle nye kilder → wiki vokser til 200-300 sider
- [ ] Opret `lidelser/`-sider der mapper symptomer → behandlinger

### Fase 3: AI-Guide integration
- [ ] Embed chat-widget på sanneandersen.dk
- [ ] Connect til LLM Wiki via API/MCP
- [ ] Tilføj guardrails: disclaimer, "book en tid"-CTA, grænser for sundhedsrådgivning
- [ ] A/B test med rigtige klienter

### Fase 4: Kursusplatform
- [ ] difzt.dk wiki-sektion med undervisningsindhold
- [ ] Studerende kan query'e wiki'en under studiet
- [ ] Sanne/undervisere tilføjer løbende nyt materiale → wiki kompilerer automatisk

---

## 7. Risici og Mitigering

### Sundhedsanprisninger
**Risiko:** AI'en giver sundhedsråd der kan fortolkes som lægelig diagnose.
**Mitigering:** Alle svar inkluderer disclaimer. AI'en anbefaler altid konsultation for specifikke symptomer. Wiki-sider tagges med `medical-disclaimer: true`.

### Indholdskvalitet
**Risiko:** LLM kompilerer wiki-sider med fejl eller misforståelser af Sannes faglige pointer.
**Mitigering:** Sanne reviewer alle wiki-sider efter ingest. Lint-cyklus flagger ændringer til review. Kritiske sider (behandlinger, urte-doseringer) kræver manuel godkendelse.

### Urtedoseringer
**Risiko:** Forkerte doseringer kan være skadelige.
**Mitigering:** Doseringer hentes altid ordret fra kildematerialet, aldrig genereret. Wiki-sider med doseringer tagges med `dosage-source: [kildefil]` for sporbarhed.

### Skala
**Risiko:** LLM Wiki-patternen skalerer ikke til enterprise-niveau.
**Mitigering:** Sannes vidensunivers er per definition bounded. Selv med 500 kilder og 5.000 wiki-sider er vi langt inden for sweet spot. Skalering er ikke en bekymring for dette projekt.

### Vedligeholdelse
**Risiko:** Wiki'en stagnerer fordi ingen tilføjer nye kilder.
**Mitigering:** Automatisk ingest ved upload. Sanne tilfører naturligt nyt materiale via sin praksis. Lint-cyklus kører periodisk og foreslår nye sources at søge efter.

---

## 8. Konklusion

**LLM Wiki er det rigtige arkitekturvalg for Sannes vidensbank.** Ikke fordi RAG er dårligt generelt, men fordi Sannes vidensunivers har præcis de egenskaber der gør LLM Wiki overlegen:

1. **Domænebundet** — zoneterapi, biopati, urtemedicin, TKM. Ikke bred, uforudsigelig søgning.
2. **Dybt relationelt** — urter ↔ organer ↔ zoner ↔ behandlinger ↔ faseforløb ↔ kost. RAG ser ikke relationer.
3. **Kompounding** — hver ny kilde (artikel, forskningsresultat, patientcase) beriger hele netværket.
4. **Ekspertstyret** — Sanne er den faglige autoritet. Wiki'en bevarer hendes stemme og tilgang.
5. **Moderat skala** — hundrede kilder, tusindvis af wiki-sider. Præcis Karpathys sweet spot.

Det tilgængelige kildemateriale (6 filer, ~80 sider) er en solid start. Det dækker det biopatiske fundament, neurovidenskabelig forskning, anatomi, urtemedicin og zoneterapi-zoner. Med 50-100 yderligere kilder fra Sannes 25 års praksis bliver dette en vidensbank der ingen konkurrenter har i det danske alternativbehandlingsmiljø.

Karpathys observation gælder her i sin reneste form:

> "The human curates sources, directs analysis, asks good questions, and thinks about meaning. The LLM handles everything else."

Sanne curaterer. LLM'en kompilerer. Klienterne får adgang til 25 års akkumuleret viden — struktureret, krydstjekket og leveret med empati.

---

*Dokument genereret som del af LLM Wiki-ts projektet.*
*Kildemateriale: Pitch Vault (pitch.broberg.dk) + lidttilvoresrack.zip*
