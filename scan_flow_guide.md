# Scan Flow Console Log Guide

## 🔍 Complete Data Flow Tracking

Console logs di `Scan.tsx` sekarang melacak seluruh alur data dari scan hingga database:

### 📱 1. QR Code Detection Flow
```
🎯 QR code detected: [qr_text]
📝 QR data is JSON format: [parsed_data]
✅ QR data parsed successfully (JSON): [qr_data]
📍 QR Location ID: [location_id]
📍 QR Location Name: [location_name]
✅ QR validation successful!
📍 Valid location: [location_data]
🍼 Generated bottle count: [number]
```

### 🔘 2. Button Click Flow
```
🔘 Konfirmasi button clicked!
  - Current isProcessing: [boolean]
  - confirmDisposalRef.current: [boolean]
  - ScanResult: [scan_data]
  - Timestamp: [iso_timestamp]
  - Execution ID: [unique_id]
```

### 🚀 3. Database Insert Flow
```
🚀 === SCAN TO DATABASE FLOW START ===
📊 SCAN DATA TO INSERT:
  - User ID: [user_id]
  - Location ID: [location_id]
  - Location Name: [location_name]
  - Bottles Count: [number]
  - Weight Kg: [number]
  - Points Earned: [number]
  - Timestamp: [iso_timestamp]
  - Execution ID: [unique_id]

📤 INSERTING INTO ACTIVITIES TABLE...
✅ ACTIVITY INSERT SUCCESSFUL!
📋 INSERTED ACTIVITY DATA:
  - Activity ID: [activity_id]
  - Created At: [timestamp]
  - All Fields: [complete_activity_object]
```

### 📈 4. Profile Update Flow
```
📈 Calculating profile based on activities...
📋 Profile BEFORE activity fetch: [profile_data]
🔍 Trigger detection:
  - Profile after trigger: [profile_after_trigger]
  - Expected before trigger: [expected_values]
  - Difference from trigger: [differences]

📊 Activity-based calculation:
  - Fetched activities: [count]
  - Including current activity: [total_count]
  - Total bottles from activities: [total_bottles]
  - Total points from activities: [total_points]
  - Total weight from activities: [total_weight]

📈 === PROFILE UPDATE FLOW START ===
📤 UPDATING PROFILE TABLE...
📊 PROFILE UPDATE DATA:
  - User ID: [user_id]
  - Total Points: [total_points]
  - Total Bottles: [total_bottles]
  - Total Weight: [total_weight]
  - Calculation based on: [number] activities

✅ PROFILE UPDATE SUCCESSFUL!
📋 UPDATED PROFILE DATA:
  - Profile ID: [profile_id]
  - New Points: [new_points]
  - New Total Bottles: [new_bottles]
  - New Total Weight: [new_weight]
  - Updated At: [timestamp]

🚨 DISCREPANCY DETECTED! (if any)
  - Expected bottles: [expected]
  - Actual bottles: [actual]
  - Difference: [difference]
  - Possible cause: Database trigger or concurrent update

🎯 === SCAN TO DATABASE FLOW COMPLETE ===
📊 FINAL SUMMARY:
  - Activity ID: [activity_id]
  - Activity saved: ✅
  - Profile updated: ✅
  - Final bottles: [final_bottles]
  - Final points: [final_points]
  - Final weight: [final_weight]
```

### 🚨 5. Error Handling Flow
```
❌ ACTIVITY INSERT FAILED: [error_details]
❌ PROFILE UPDATE FAILED: [error_details]
❌ Error details: [complete_error_object]
⚠️ Activity saved but profile update failed - User can continue
❌ Table or RLS policy issue
❌ Missing table error
❌ 404 Error - Table not found or permission denied
❌ 403 Error - Permission denied
❌ Unknown error: [error_message]
```

## 🔧 How to Use

### 1. Buka Browser Console
- Tekan `F12` atau `Ctrl+Shift+I` (Windows)
- Pergi ke tab `Console`

### 2. Filter Logs
- Cari `🚀` untuk flow start
- Cari `✅` untuk success
- Cari `❌` untuk errors
- Cari `🚨` untuk discrepancies

### 3. Monitor Double Increment
```
🚨 DISCREPANCY DETECTED!
  - Expected bottles: 10
  - Actual bottles: 15
  - Difference: 5
  - Possible cause: Database trigger or concurrent update
```

### 4. Verify Data Flow
- Pastikan `✅ ACTIVITY INSERT SUCCESSFUL!` muncul
- Pastikan `✅ PROFILE UPDATE SUCCESSFUL!` muncul
- Check `🎯 === SCAN TO DATABASE FLOW COMPLETE ===` untuk final result

## 📊 Key Metrics to Monitor

### ✅ Success Indicators:
- Activity ID generated
- Profile updated with correct totals
- No discrepancy detected
- Final summary shows expected values

### 🚨 Problem Indicators:
- Activity insert failed
- Profile update failed
- Discrepancy detected (difference ≠ 0)
- Database errors (404, 403, etc.)

### 🔍 Debug Information:
- Execution ID untuk tracking session
- Timestamps untuk sequence analysis
- Complete data objects untuk verification
- Before/after comparisons untuk trigger detection

## 🎯 Expected Normal Flow:
1. QR detected → validated → location found
2. Button clicked → confirmDisposal started
3. Activity inserted → success with ID
4. Activities fetched → totals calculated
5. Profile updated → matches expected values
6. Flow complete → no discrepancies

**Gunakan console logs ini untuk mendiagnosis masalah double increment dan verifikasi alur data yang benar!** 🔍📊✅
