#!/bin/bash
# SIFEX demo data — natural curl API operations
# Creates 200 MAWBs + 1000 HAWBs across all workflow stages
set -euo pipefail

BASE="http://localhost:3000"; COOKIE="/tmp/sifex_cookies.txt"
CAN_ID="680393ef-79f6-475d-b1db-703033d4c41e"
HKG_ID="d6d35225-96dc-46fb-b3dc-2a3a0efbad4b"; DAR_ID="74603083-cf51-4209-a976-9429fa414461"; NBO_ID="a7f10e63-4f26-42d0-8985-869624bc5ba0"
ET_ID="e8a5238b-f4cf-4c3b-a602-142b64c9c4f7"; TK_ID="a74ca9b5-fc30-442d-a276-184406654df7"; QR_ID="33141885-4ac8-4268-afd7-72c620ac7fda"; EK_ID="65d962a8-cc6f-47da-8f01-e46bc8cb3816"
CUSTOMER_IDS=("a28c970b-86c2-46f3-8ace-0d4426be64c5" "feea73b2-b527-4c4e-9b2f-0563933116d4" "b8777629-bc59-4ac2-8790-c33bbbb13a19")
RIDER_ID="82482eb1-3031-40af-9656-c86e1ad76139"
AIRLINES=($ET_ID $TK_ID $QR_ID $EK_ID); STATIONS=($HKG_ID $DAR_ID $NBO_ID)
FLIGHTS=("ET-609" "TK-604" "QR-101" "EK-207" "ET-812" "TK-305" "QR-506" "EK-703")

SENDER=("China Electronics Ltd:China Electronics Ltd:88 Tianhe Rd:+862012345601:Guangzhou" "Guangzhou Textiles Corp:Guangzhou Textiles Corp:456 Huanshi Rd:+862012345602:Guangzhou" "Shenzhen Tech Logistics:Shenzhen Tech Logistics:12 Science Park:+862012345603:Shenzhen" "Beijing Medical Supplies:Beijing Medical Supplies:45 Chang'an Ave:+861012345604:Beijing" "Shanghai Auto Parts Ltd:Shanghai Auto Parts Ltd:78 Pudong Rd:+862112345605:Shanghai" "Hong Kong Electronics:Hong Kong Electronics:21 Nathan Rd:+85212345606:Hong Kong" "Ningbo Home Goods:Ningbo Home Goods:34 Port Rd:+862112345607:Ningbo" "Foshan Ceramics Ltd:Foshan Ceramics Ltd:56 Indus Park:+862112345608:Foshan" "Xiamen Seafood Export:Xiamen Seafood Export:90 Harbor St:+862112345609:Xiamen" "Dongguan Fashion Wear:Dongguan Fashion Wear:23 Garment Rd:+862112345610:Dongguan")
RECEIVER=("Tanzania Pharma Ltd:Tanzania Pharma Ltd:Plot 123 Bagamoyo Rd:+255712345601:Dar es Salaam" "JN Textiles (T) Ltd:JN Textiles (T) Ltd:456 Mkwepu St:+255712345602:Dar es Salaam" "David Kamau::789 Kenyatta Rd:+255712345603:Arusha" "Azam Industries:Azam Industries:321 Nyerere Rd:+255712345604:Dar es Salaam" "TBL:TBL:567 Mandela Rd:+255712345605:Dar es Salaam" "Kilimanjaro Motors:Kilimanjaro Motors:890 Moshi Rd:+255712345606:Arusha" "Tanga Cement Co:Tanga Cement:123 Tanga Port:+255712345607:Tanga" "Mwanza Fish:Mwanza Fish:456 Lake Rd:+255712345608:Mwanza" "Zanzibar Spice:Zanzibar Spice:789 Stone Town:+255712345609:Zanzibar" "Dar Logistics:Dar Logistics:12 Kariakoo:+255712345610:Dar es Salaam")
DESC=("Medical equipment" "Textile fabrics" "Electronic components" "Auto spare parts" "Industrial machinery" "Consumer electronics" "Home appliances" "Construction materials" "Food products" "Cosmetics" "Agricultural equipment" "Office furniture" "Sports equipment" "Books" "Chemical reagents")
rnd() { echo $((RANDOM%($2-$1+1)+$1)); }

# ---- Workflow stage distribution (200 entries, shuffled) ----
stages=()
for i in $(seq 1 15); do stages+=("EXPORT:DRAFT"); done
for i in $(seq 1 10); do stages+=("EXPORT:VALIDATED"); done
for i in $(seq 1 10); do stages+=("EXPORT:HAWB_GENERATED"); done
for i in $(seq 1 5); do stages+=("EXPORT:MAWB_ASSIGNED"); done
for i in $(seq 1 5); do stages+=("EXPORT:FLIGHT_ASSIGNED"); done
for i in $(seq 1 5); do stages+=("EXPORT:DISPATCHED"); done
for i in $(seq 1 10); do stages+=("IMPORT:PRE_ARRIVAL"); done
for i in $(seq 1 10); do stages+=("IMPORT:TERMINAL_ARRIVED"); done
for i in $(seq 1 10); do stages+=("IMPORT:RECEIVED"); done
for i in $(seq 1 10); do stages+=("IMPORT:DOCUMENTS_VERIFIED"); done
for i in $(seq 1 10); do stages+=("IMPORT:CUSTOMS_SUBMITTED"); done
for i in $(seq 1 10); do stages+=("IMPORT:CUSTOMS_CLEARED"); done
for i in $(seq 1 15); do stages+=("WAREHOUSE:STORED"); done
for i in $(seq 1 15); do stages+=("WAREHOUSE:INVOICE_GENERATED"); done
for i in $(seq 1 15); do stages+=("WAREHOUSE:WAITING_PAYMENT"); done
for i in $(seq 1 15); do stages+=("DELIVERY:RIDER_ASSIGNED"); done
for i in $(seq 1 15); do stages+=("DELIVERY:DELIVERED"); done
for i in $(seq 1 15); do stages+=("DELIVERY:COMPLETED"); done
for i in $(seq 0 $((${#stages[@]}-1))); do j=$((RANDOM%(${#stages[@]}-i)+i)); tmp="${stages[$i]}"; stages[$i]="${stages[$j]}"; stages[$j]="$tmp"; done

echo ""; echo "========== SIFEX DEMO DATA GENERATOR (curl) =========="

# ---- PHASE 1: LOGIN ----
echo ""; echo "--- Phase 1: Login ---"
rm -f "$COOKIE"
csrf_resp=$(curl -s -D - "$BASE/api/auth/csrf" 2>&1)
csrf_token=$(echo "$csrf_resp" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4 | tail -1)
csrf_cookie=$(echo "$csrf_resp" | grep -i 'set-cookie.*csrf' | sed 's/.*: //' | cut -d';' -f1)
curl -s -c "$COOKIE" -H "Cookie: $csrf_cookie" \
  -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$csrf_token&email=admin@sifex.com&password=Sifex@Admin2025!" > /dev/null
echo "  Login: OK"

# ---- PHASE 2: CREATE 200 MASTER AWBs ----
echo ""; echo "--- Phase 2: Creating 200 Master AWBs ---"
MAWB_FILE="/tmp/sifex_mawbs.txt"; : > "$MAWB_FILE"
ok=0; fail=0
for i in $(seq 1 200); do
  anum="071-$((30000000+i))"; trk="SIF-$(printf '%04d' $i)"
  IFS=':' read -r sn sc sa sp scity <<< "${SENDER[RANDOM%${#SENDER[@]}]}"
  IFS=':' read -r rn rc ra rp rcity <<< "${RECEIVER[RANDOM%${#RECEIVER[@]}]}"
  d="${DESC[RANDOM%${#DESC[@]}]}"; dest="${STATIONS[RANDOM%3]}"; al="${AIRLINES[RANDOM%4]}"; fl="${FLIGHTS[RANDOM%8]}"
  pc=$(rnd 10 200); wt=$(rnd 200 5000); cv=$(rnd 5000 100000); vol=$(echo "scale=1; $(rnd 10 800)/10"|bc -l)
  [ $((i%2)) -eq 0 ] && pm="PP" || pm="CC"
  json="{\"awbNumber\":\"$anum\",\"trackingNumber\":\"$trk\",\"shipmentType\":\"CAN_GUANGZHOU\",\"paymentMode\":\"$pm\",\"currency\":\"USD\",\"customsValue\":$cv,\"originStationId\":\"$CAN_ID\",\"destinationStationId\":\"$dest\",\"senderName\":\"$sn\",\"senderCompany\":\"$sc\",\"senderAddress\":\"$sa\",\"senderPhone\":\"$sp\",\"senderCity\":\"$scity\",\"senderCountry\":\"China\",\"receiverName\":\"$rn\",\"receiverCompany\":\"$rc\",\"receiverAddress\":\"$ra\",\"receiverPhone\":\"$rp\",\"receiverCity\":\"$rcity\",\"receiverCountry\":\"Tanzania\",\"awbPieces\":$pc,\"awbWeight\":$wt,\"volume\":$vol,\"description\":\"$d\",\"airlineId\":\"$al\",\"flightNumber\":\"$fl\"}"
  resp=$(curl -s -b "$COOKIE" -X POST "$BASE/api/master-awbs" -H "Content-Type: application/json" -d "$json" 2>&1)
  if echo "$resp"|grep -q '"error"'; then
    echo "  FAIL $anum: $(echo "$resp"|grep -o '"message":"[^"]*"'|cut -d'"' -f4)"; fail=$((fail+1))
  else
    mid=$(echo "$resp"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
    echo "$mid|$anum|${stages[$((i-1))]}" >> "$MAWB_FILE"
    echo "  OK $i/200 $anum"; ok=$((ok+1))
  fi
done
echo "  => $ok MAWBs ($fail failed)"

# ---- PHASE 3: CREATE 1000 HOUSE AWBs ----
echo ""; echo "--- Phase 3: Creating 1000 House AWBs (5 per MAWB) ---"
hok=0; hfail=0; mi=1
while IFS='|' read -r mid anum sinfo; do
  sh="${CUSTOMER_IDS[RANDOM%3]}"; re="${CUSTOMER_IDS[RANDOM%3]}"
  for h in $(seq 1 5); do
    hn="HKG-$(printf '%04d' $mi)-$(printf '%03d' $h)"; tr="SIF-H-$(printf '%04d' $mi)-$(printf '%02d' $h)"
    de="${DESC[RANDOM%${#DESC[@]}]}"; hs="$((10000000+RANDOM%89999999))"
    hp=$(rnd 1 50); hw=$(rnd 20 500); [ $((h%2)) -eq 0 ] && pm_h="PP" || pm_h="CC"
    j2="{\"masterAWBId\":\"$mid\",\"houseAWBNumber\":\"$hn\",\"trackingNumber\":\"$tr\",\"shipperId\":\"$sh\",\"receiverId\":\"$re\",\"shipmentType\":\"CAN_GUANGZHOU\",\"paymentMode\":\"$pm_h\",\"currency\":\"USD\",\"pieces\":$hp,\"weight\":$hw,\"description\":\"$de\",\"hsCode\":\"$hs\",\"originCountry\":\"China\",\"destinationCountry\":\"Tanzania\"}"
    resp2=$(curl -s -b "$COOKIE" -X POST "$BASE/api/house-awbs" -H "Content-Type: application/json" -d "$j2" 2>&1)
    if echo "$resp2"|grep -q '"error"'; then hfail=$((hfail+1)); else hok=$((hok+1)); fi
  done
  if [ $((mi%20)) -eq 0 ]; then echo "  $((mi*5)) HAWBs so far..."; fi
  mi=$((mi+1))
done < "$MAWB_FILE"
echo "  => $hok HAWBs ($hfail failed)"

# ---- PHASE 4: SET WORKFLOW STATUSES via PATCH ----
echo ""; echo "--- Phase 4: Setting workflow statuses ---"
pok=0; pfail=0; mi=1
while IFS='|' read -r mid anum sinfo; do
  mod="${sinfo%%:*}"; st="${sinfo##*:}"
  [ "$mod" = "BILLING" ] && wfs="WAREHOUSE" || wfs="$mod"
  [ "$mod" = "WAREHOUSE" ] && wfs="WAREHOUSE"
  [ "$mod" = "DELIVERY" ] && wfs="DELIVERY"

  if [ "$st" = "DRAFT" ]; then echo "  $mi/200 $anum DRAFT (skip)"; pok=$((pok+1)); mi=$((mi+1)); continue; fi

  if [ "$st" = "PAID" ]; then
    curl -s -b "$COOKIE" -X PATCH "$BASE/api/master-awbs/$mid" -H "Content-Type: application/json" -d '{"workflowStatus":"WAITING_PAYMENT","workflowStage":"WAREHOUSE"}' > /dev/null 2>&1 || true
    resp3=$(curl -s -b "$COOKIE" -X PATCH "$BASE/api/master-awbs/$mid" -H "Content-Type: application/json" -d '{"workflowStatus":"PAID","workflowStage":"DELIVERY"}' 2>&1)
  else
    resp3=$(curl -s -b "$COOKIE" -X PATCH "$BASE/api/master-awbs/$mid" -H "Content-Type: application/json" -d "{\"workflowStatus\":\"$st\",\"workflowStage\":\"$wfs\"}" 2>&1)
  fi

  if echo "$resp3"|grep -q '"error"'; then
    echo "  $mi/200 $anum→$st FAIL: $(echo "$resp3"|grep -o '"message":"[^"]*"'|cut -d'"' -f4)"; pfail=$((pfail+1))
  else
    echo "  $mi/200 $anum→$st ($wfs) ✓"; pok=$((pok+1))
  fi
  mi=$((mi+1))
done < "$MAWB_FILE"
echo "  => $pok OK ($pfail failed)"

# ---- PHASE 5: CREATE BILLING + PAYMENTS ----
echo ""; echo "--- Phase 5: Billing records ---"
# Auto-billing via cargoStatus=RELEASED
biok=0; mi=1
while IFS='|' read -r mid anum sinfo; do
  if [[ "$sinfo" == WAREHOUSE:* ]] || [[ "$sinfo" == DELIVERY:* ]]; then
    curl -s -b "$COOKIE" -X PATCH "$BASE/api/master-awbs/$mid" -H "Content-Type: application/json" -d '{"cargoStatus":"RELEASED"}' > /dev/null 2>&1 && biok=$((biok+1))
  fi
done < "$MAWB_FILE"
echo "  $biok billing records created"

# Mark as PAID via PATCH /api/billing/[id]
echo ""; echo "--- Phase 5b: Mark PAID ---"
pak=0; mi=1
while IFS='|' read -r mid anum sinfo; do
  if [[ "$sinfo" == DELIVERY:RIDER_ASSIGNED ]] || [[ "$sinfo" == DELIVERY:DELIVERED ]] || [[ "$sinfo" == DELIVERY:COMPLETED ]]; then
    # Get the billing record for this MAWB
    bills=$(curl -s -b "$COOKIE" "$BASE/api/billing?limit=10&status=WAITING_PAYMENT" 2>&1)
    # Find the right one by matching masterAWBId - too complex. Just mark all as paid.
    # Actually let's get all MAWB billing records
    hawb_resp=$(curl -s -b "$COOKIE" "$BASE/api/house-awbs?masterAWBId=$mid&limit=1" 2>&1)
    hid=$(echo "$hawb_resp"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
    [ -z "$hid" ] && continue
    bresp=$(curl -s -b "$COOKIE" "$BASE/api/billing?houseAWBId=$hid&limit=1" 2>&1)
    bid=$(echo "$bresp"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
    [ -n "$bid" ] && curl -s -b "$COOKIE" -X PATCH "$BASE/api/billing/$bid" -H "Content-Type: application/json" -d '{"status":"PAID"}' > /dev/null 2>&1 && pak=$((pak+1))
  fi
done < "$MAWB_FILE"
echo "  $pak marked PAID"

# ---- PHASE 6: DELIVERY TASKS ----
echo ""; echo "--- Phase 6: Delivery tasks ---"
dtok=0; dtfail=0; mi=1
while IFS='|' read -r mid anum sinfo; do
  if [[ "$sinfo" != DELIVERY:* ]]; then mi=$((mi+1)); continue; fi
  dst="${sinfo##*:}"
  hawb_r=$(curl -s -b "$COOKIE" "$BASE/api/house-awbs?masterAWBId=$mid&limit=1" 2>&1)
  hid=$(echo "$hawb_r"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
  [ -z "$hid" ] && dtfail=$((dtfail+1)) && mi=$((mi+1)) && continue

  # Create task → POST /api/delivery-tasks
  dj="{\"masterAWBId\":\"$mid\",\"houseAWBId\":\"$hid\",\"deliveryAddress\":\"Dar es Salaam\"}"
  dr=$(curl -s -b "$COOKIE" -X POST "$BASE/api/delivery-tasks" -H "Content-Type: application/json" -d "$dj" 2>&1)
  tid=$(echo "$dr"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
  [ -z "$tid" ] && dtfail=$((dtfail+1)) && mi=$((mi+1)) && continue

  # Transition to target status via PATCH
  case "$dst" in
    RIDER_ASSIGNED)
      curl -s -b "$COOKIE" -X PATCH "$BASE/api/delivery-tasks/$tid" -H "Content-Type: application/json" \
        -d "{\"assignedRiderId\":\"$RIDER_ID\",\"status\":\"ASSIGNED\"}" > /dev/null 2>&1 && dtok=$((dtok+1)) || dtfail=$((dtfail+1))
      ;;
    DELIVERED)
      curl -s -b "$COOKIE" -X PATCH "$BASE/api/delivery-tasks/$tid" -H "Content-Type: application/json" \
        -d "{\"assignedRiderId\":\"$RIDER_ID\",\"status\":\"ASSIGNED\"}" > /dev/null 2>&1
      curl -s -b "$COOKIE" -X PATCH "$BASE/api/delivery-tasks/$tid" -H "Content-Type: application/json" \
        -d '{"status":"STARTED"}' > /dev/null 2>&1
      curl -s -b "$COOKIE" -X PATCH "$BASE/api/delivery-tasks/$tid" -H "Content-Type: application/json" \
        -d '{"status":"DELIVERED"}' > /dev/null 2>&1 && dtok=$((dtok+1)) || dtfail=$((dtfail+1))
      ;;
    COMPLETED)
      curl -s -b "$COOKIE" -X PATCH "$BASE/api/delivery-tasks/$tid" -H "Content-Type: application/json" \
        -d "{\"assignedRiderId\":\"$RIDER_ID\",\"status\":\"ASSIGNED\"}" > /dev/null 2>&1
      curl -s -b "$COOKIE" -X PATCH "$BASE/api/delivery-tasks/$tid" -H "Content-Type: application/json" \
        -d '{"status":"STARTED"}' > /dev/null 2>&1
      curl -s -b "$COOKIE" -X PATCH "$BASE/api/delivery-tasks/$tid" -H "Content-Type: application/json" \
        -d '{"status":"DELIVERED"}' > /dev/null 2>&1
      curl -s -b "$COOKIE" -X PATCH "$BASE/api/delivery-tasks/$tid" -H "Content-Type: application/json" \
        -d '{"status":"COMPLETED"}' > /dev/null 2>&1 && dtok=$((dtok+1)) || dtfail=$((dtfail+1))
      ;;
  esac
done < "$MAWB_FILE"
echo "  $dtok delivery tasks ($dtfail failed)"

# ---- SUMMARY ----
echo ""; echo "========== SUMMARY =========="
echo "  MAWBs:        $ok"
echo "  HAWBs:        $hok"
echo "  Transitions:  $pok"
echo "  Billings:     $biok (PAID: $pak)"
echo "  Deliveries:   $dtok"
echo "  Login:        admin@sifex.com / Sifex@Admin2025!"
echo "  URL:          http://localhost:3000/workspace"
echo "================================"
