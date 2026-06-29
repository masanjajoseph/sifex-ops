# RIPOTI KWA WASIMAMIZI — MFUMO MPYA WA SIFEX LOGISTICS

---

## UTANGULIZI

Mfumo huu mpya ni **mfumo kamili wa kusimamia biashara ya usafirishaji wa mizigo** — kutoka mzigo unapoingia, kupitia ndege, forodha, ghala, malipo, hadi mteja anapoupokea mkononi. Pia unaunganisha moja kwa moja na **Mamlaka ya Mawasiliano Tanzania (TCRA)** kama inavyotakiwa na sheria.

Mfumo umejengwa kwa teknolojia ya kisasa inayotumika na makampuni makubwa duniani. Una uwezo wa:
- Kuhudumia **mamilioni ya mizigo kwa siku** bila kukwama
- Kutumiwa na **wafanyakazi wengi kwa wakati mmoja** katika ofisi zote
- Kufanya kazi **24/7 bila kusimama**
- Kuhifadhi **kumbukumbu za muda wote** bila kupoteza data

---

## 1. MFUMO UNAINGILIWAGAJE? (Login na Kuanza)

Mfumo unaingiliwa kwa njia ya mtandao (browser) — hakuna programu ya ku-install. Kila mfanyakazi anapewa **akaunti yake binafsi** na:

1. **Anapoingia kwa mara ya kwanza** — anaona ukurasa wa kwanza (Workspace) unaoonesha moduli zote anazoruhusiwa kutumia
2. **Kila moduli ni kama mlango unaoelekea sehemu tofauti** — kuna moduli ya Export, Import, Ghala, Billing, Delivery, na nyingine
3. **Kila mfanyakazi anaweza kuona moduli kulingana na daraja lake** — mtu wa ghala haoni moduli ya malipo, nk.
4. **Kila kitendo anachofanya mfanyakazi kina rekodi** — mfumo unamjua nani aliingia, alifanya nini, na lini

---

## 2. MODULI ZILIZOPO (Sehemu za Mfumo)

Mfumo una sehemu zifuatazo (kama vile ofisi tofauti ndani ya kampuni):

### OPERATIONS (Kazi za Msingi)
| Moduli | Inafanya Nini? |
|--------|----------------|
| **Export Operations** | Kusimamia mizigo inayotoka nje (China → Tanzania) — kuunda, kufuatilia, kubadilisha hali |
| **Import Operations** | Kusimamia mizigo inayofika (inapowasili, forodha, clearance) |
| **Master AWB** | Kuona mizigo mikubwa (MAWB) iliyounganishwa |
| **House AWB** | Kuona mizigo midogo (HAWB) iliyo chini ya MAWB |
| **Customs** | Kuwekwa kwa taarifa za forodha na kufuatilia clearance |
| **Flights** | Ratiba za ndege na nafasi za mizigo |
| **Manifests** | Orodha za mizigo inayopakiwa kwenye ndege |

### LOGISTICS (Usafirishaji na Ghala)
| Moduli | Inafanya Nini? |
|--------|----------------|
| **Warehouse** | Ghala — kuona mizigo iliopo, iliyo tayari kusafirishwa, na iliyochukuliwa |
| **Delivery** | Usimamizi wa delivery — wapanda pikipiki, pickups za wateja, delivery notes |
| **Parcels** | Kufuatilia vifurushi moja kwa moja |
| **Tracking** | Kufuatilia mzigo wowote kwa namba yake |

### FINANCE (Fedha)
| Moduli | Inafanya Nini? |
|--------|----------------|
| **Billing** | Invoisi, malipo, na kufuatilia nani amelipa nini |
| **Quotes** | Kuunda na kutuma bei kwa wateja kabla ya usafirishaji |

### MANAGEMENT (Usimamizi)
| Moduli | Inafanya Nini? |
|--------|----------------|
| **Customers** | Taarifa za wateja wote |
| **Human Resources** | Wafanyakazi, mahudhurio, na nyaraka za HR |
| **Procurement** | Ununuzi na wasambazaji |
| **Reports** | Ripoti na takwimu za biashara |

### SYSTEM (Mfumo)
| Moduli | Inafanya Nini? |
|--------|----------------|
| **Settings** | Mpangilio wa mfumo (sarafu, kodi, nk.) |
| **TCRA Monitor** | Kuangalia hali ya taarifa zinazotumwa kwa TCRA |
| **User Management** | Kusimamia watumiaji, majukumu, na ruhusa |

---

## 3. WORKFLOW KAMILI — Safari ya Mzigo Kuanzia Mwanzo hadi Mwisho

### HATUA KWA HATUA:

```
─➤ HATUA 1: Kuingia Mfumo (Login)
       │
       ├─ Mfanyakazi anaingia kwa akaunti yake binafsi
       ├─ Anaona moduli anazoruhusiwa (kulingana na daraja lake)
       └─ Kila kitendo chake kinarekodiwa
```

```
─➤ HATUA 2: Mzigo Unaingia (EXPORT)
       │
       ├─ Mzigo unakubaliwa na ofisi → Anapewa namba ya utambulisho
       ├─ Mizigo midogo inaweza kuunganishwa kuwa mzigo mkubwa
       ├─ Invoisi inaundwa kiotomatiki
       └─ Taarifa inatumwa kwa TCRA kiotomatiki (ACCEPTED → OT01)
```

```
─➤ HATUA 3: Mzigo Unajiandaa Kusafiri
       │
       ├─ Mzigo unawekwa kwenye orodha ya ndege (Manifest)
       ├─ Mzigo unapakiwa kwenye ndege
       └─ Taarifa inatumwa kwa TCRA kiotomatiki (RCS → OT02)
```

```
─➤ HATUA 4: Mzigo Upo Ndegeni (IN TRANSIT)
       │
       ├─ Mzigo umeondoka — hauonekani tena kwenye Export
       │  (Unaonekana kwenye Import badala yake)
       └─ Wateja wanaweza kufuatilia kwa tracking number
```

```
─➤ HATUA 5: Mzigo Umewasili (IMPORT)
       │
       ├─ Mzigo umefika — unaingia kwenye forodha
       ├─ Forodha inafanya ukaguzi wake
       ├─ Kama kuna swali → mfumo unaashiria (Customs Hold/Query)
       └─ Baada ya forodha kuridhia → RELEASED
```

```
─➤ HATUA 6: Mzigo Ameachiliwa (RELEASED) → GHALA (WAREHOUSE)
       │
       ├─ ★ HATUA MUHIMU: Invoisi za kila mzigo mdogo 
       │  zinatengenezwa moja kwa moja na mfumo
       │  (zinajitengeneza wenyewe — hakuna anayezisahau)
       │
       ├─ Mzigo unaingia ghalani
       ├─ Mfumo anajua kama umelipwa au bado
       ├─ Ikiwa umelipwa → unaweza kutolewa kwa mteja
       │
       └─ TAARIFA KWA TCRA: Baada ya kukamilika, taarifa
           inatumwa kiotomatiki (DELIVERED → OT04)
```

```
─➤ HATUA 7: Mzigo Unasubiri Kuchukuliwa (AWAITING DELIVERY)
       │
       ├─ Ofisa wa ghala anaweza kuweka alama "tayari kwa delivery"
       │
       ├─ NJIA A: Mteja Anakuja Ofisini (PICKUP)
       │     ├─ Delivery Note inaundwa (hati ya kukabidhi)
       │     ├─ Mteja anasaini (au mwakilishi wake anasaini)
       │     └─ Mzigo anapewa mteja
       │
       └─ NJIA B: Mzigo Unapelekwa (DELIVERY)
             ├─ Dereva (rider) anapewa mzigo
             ├─ Dereva anapeleka kwa mteja
             ├─ Mteja anasaini
             └─ Hati ya kukabidhi inahifadhiwa
```

```
─➤ HATUA 8: Mzigo Umefika kwa Mteja (COMPLETED)
       │
       ├─ Mzigo umekamilika — safari yake imeisha
       ├─ Historia yote inaonekana tangu mwanzo
       ├─ Invoisi imelipwa (au bado kama ni mkopo)
       └─ Delivery note imesainiwa
```

---

## 4. MUUNGANISHO NA SERIKALI — TCRA INTEGRATION

### Hii ni nini?
TCRA (Mamlaka ya Mawasiliano Tanzania) inataka kampuni zote za usafirishaji zitume taarifa za mizigo kwao kwa njia ya mtandao. Mfumo huu unafanya hivyo **moja kwa moja kiotomatiki** — hakuna mtu anayeandika tena au kutuma barua pepe.

### Inafanyaje kazi?
1. Wakati hali ya mzigo inabadilika (k.m. unapokubaliwa, unapopakiwa, unapowasilishwa), **mfumo anajitengenezea ujumbe wa kutumwa kwa TCRA**
2. Ujumbe unawekwa kwenye **foleni ya kutuma** (outbox) — hata kama mtandao umekatika, ujumbe haupotei
3. Mfumo anajaribu kutuma ujumbe hadi ufike
4. Kama ujumbe umeshindwa kutuma, **mfumo anajaribu tena** (hadi mafanikio)
5. Kuna **ukurasa wa kufuatilia** (TCRA Monitor) unaoonesha:
   - Ni taarifa gani zimetumwa
   - Ni zipi zinazosubiri
   - Ni zipi zimeshindwa (na kwa nini)

### Aina za taarifa zinazotumwa:
| Tukio | Namba ya TCRA | Maana |
|-------|---------------|-------|
| Mzigo umekubaliwa | OT01 | Cargo accepted |
| Mzigo umepakiwa kwenye ndege | OT02 | Cargo dispatched |
| Mzigo umefika kwa mteja | OT04 | Cargo delivered |

### Faida za muunganisho huu:
- **Hakuna kazi ya ziada** — taarifa zinajituma zenyewe
- **Hakuna adhabu** — serikali haitoi faini kwa kukosa taarifa
- **Usahihi** — taarifa zinazofika kwa TCRA ni zile zile zilizo kwenye mfumo wetu
- **Ufuatiliaji** — unaweza kuona kama TCRA wamepokea taarifa au la

---

## 5. KINGA DHIDI YA WIZI NA MAKOSA

### Shida za zamani na suluhisho la mfumo mpya:

| Tatizo la Zamani | Suluhisho la Mfumo Mpya |
|------------------|--------------------------|
| **Mzigo alipotea** kati ya forodha na delivery — hakuna aliyekujua aliko | Kila hatua ina rekodi yake na tarehe kamili. Unafungua mfumo, unaona mzigo uko wapi kwa sekunde |
| **Invoisi hazikuwa na mzigo wao** — mzigo mmoja akalipwa, mwingine hakulipwa | Kila mzigo ana invoice yake binafsi. Invoice inamjua mzigo wake, mzigo anajua invoice yake |
| **Wafanyakazi walibadilisha taarifa** bila kujulikana | Kila kitendo kina rekodi ya nani alifanya, lini, na saa ngapi. Hakuna mabadiliko ya siri |
| **Mizigo iliolipwa na haijalipwa ilichanganyika** — haikujulikana nini kiko wapi | Mfumo anajua kiotomatiki. Unaweza kuona: "mizigo iliolipwa", "haijalipwa", "ghalani", "imepelekwa" |
| **Mizigo ilitoweka kwenye mfumo** baada ya kufika ghala | Kuna moduli maalum ya ghala inayoonyesha mizigo yote iliopo. Hakuna anayetoweka |
| **Ripoti hazikuwa sahihi** — mtu akibadilisha mwishoni mwa mwezi | Historia yote inabaki. Mwezi wowote unaweza kuangalia nyuma na kupata ukweli |
| **Deliveries hazikuwa na uthibitisho** — mteja akidai hakupata mzigo | Kila delivery ina saini ya mteja na delivery note iliyohifadhiwa |
| **TCRA hawakupata taarifa** au zilichelewa | Sasa zinajituma moja kwa moja mara hali inapobadilika |

---

## 6. UWEZO WA KUSHUGHULIA DATA NYINGI SANA

Mfumo huu umejengwa kwa teknolojia inayotumika na makampuni makubwa duniani kama Netflix na Uber. Hivyo:

### Ana uwezo wa:
- **Kuhudumia mamilioni ya mizigo kwa siku** — kama mzigo 1,000,000 unaingia kila siku, mfumo anawaza kuyaweka na kuyatafuta kwa haraka
- **Kushughulikia maelfu ya watumiaji kwa wakati mmoja** — wafanyakazi 500+ wanaweza kutumia mfumo kwa pamoja
- **Kupata taarifa kwa sekunde moja** — hata kama kuna taarifa za miaka mingi
- **Kufanya kazi siku nzima kamwe** — hakuna wakati wa "mfumo umekwama"

### Kwa nini haukwami?
1. **Faharasa maalum** — kama vile kitabu chenye faharasa, mfumo anatafuta kwa haraka bila kupitia kurasa zote
2. **Kumbukumbu ya haraka** — data zinazotumiwa mara kwa mara zinabaki kwenye kumbukumbu ya haraka
3. **Usanifu wa kupanuka** — kama biashara inakua, mfumo anaweza kuongezewa nguvu bila kubadilishwa
4. **Database ya kisasa (PostgreSQL)** — ndiyo database maarufu zaidi duniani kwa biashara kubwa

---

## 7. KWA KIFUPI — Faida Kuu

```
✓ HAKUNA MZIGO ANAPOTEA — kila mzigo anafuatiliwa kutoka mwanzo hadi mwisho
✓ HAKUNA MAPATO YANAPOTEA — kila mzigo ana invoice yake
✓ HAKUNA WIZI — kila kitendo kina rekodi ya nani alifanya
✓ HAKUNA MAKOSA YA KUSAMEHE — mfumo anajua yote
✓ SERIKALI INARIDHIKA — taarifa za TCRA zinajituma kiotomatiki
✓ WATEJA WANAFURAHI — wanaweza kufuatilia mizigo yao
✓ DATA ZOTE ZIKO SALAMA — mfumo una nguvu ya kuhifadhi na kusoma data nyingi
✓ BIASHARA INAENDA SAWA — kila kitu kiko wazi na hakijifichi
```

**Mfumo huu si mfumo wa kawaida — huu ni mfumo kamili wa kisasa unaohakikisha kila hatua ya biashara inaenda sawa na wazi kwa kila mtu.** 