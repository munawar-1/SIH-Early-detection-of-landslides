import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { submitPublicReport } from '../services/apiService';
import { getActiveMonitorCoordinate, setActiveMonitorCoordinate } from '../services/coordinateService';
import { APP_COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';

interface UploadReportScreenProps {
  onReportSubmitted?: () => void;
}

const CATEGORIES = [
  { id: 'Crack', label: 'Crack', icon: '🪨', desc: 'Road/slope surface fissures & ground cracks' },
  { id: 'Slope Movement', label: 'Slope Movement', icon: '⛰️', desc: 'Mud sliding, falling rocks, ground displacement' },
  { id: 'Blocked Road', label: 'Blocked Road', icon: '🚧', desc: 'Debris blockage on highway or railway line' },
  { id: 'Other', label: 'Other', icon: '📍', desc: 'Water seepage, tilted trees, or other anomalies' }
];

export const UploadReportScreen: React.FC<UploadReportScreenProps> = ({ onReportSubmitted }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Crack');
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: 'PHOTO' | 'VIDEO';
    mimeType?: string;
    filename?: string;
    fileSize?: number;
  } | null>(null);

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null>(null);

  const [locationName, setLocationName] = useState<string>('Loading active coordinates...');
  const [isCustomCoord, setIsCustomCoord] = useState<boolean>(false);
  const [coordSource, setCoordSource] = useState<string>('Monitor Screen');
  const [description, setDescription] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadActiveCoordinates();
  }, []);

  const loadActiveCoordinates = async () => {
    setIsLocating(true);
    setErrorMessage(null);
    try {
      const active = await getActiveMonitorCoordinate();
      setCoords({
        latitude: active.latitude,
        longitude: active.longitude,
        accuracy: active.accuracy ?? 5
      });
      setLocationName(active.locationName);
      setIsCustomCoord(Boolean(active.isCustom));
      setCoordSource(active.isCustom ? 'Active Assessment Sector' : 'Monitor Screen GPS');
    } catch (err: any) {
      setErrorMessage('Could not load active coordinates from monitor.');
    } finally {
      setIsLocating(false);
    }
  };

  const fetchRealGpsLocation = async () => {
    setIsLocating(true);
    setErrorMessage(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Location permission was denied. Real GPS coordinates are required for hazard reports.');
        setLocationName('GPS Permission Required');
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setCoords({
        latitude: lat,
        longitude: lng,
        accuracy: loc.coords.accuracy
      });
      setIsCustomCoord(false);
      setCoordSource('Manual GPS Fix');

      let resolvedName = `GPS Point (${lat.toFixed(4)}°, ${lng.toFixed(4)}°), Dima Hasao`;
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (reverse && reverse.length > 0) {
          const place = reverse[0];
          const nameParts = [place.name, place.street, place.district, place.subregion, place.city, place.region]
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i);

          if (nameParts.length > 0) {
            resolvedName = nameParts.slice(0, 3).join(', ');
          }
        }
      } catch (revErr) {
        // fallback
      }
      setLocationName(resolvedName);
      await setActiveMonitorCoordinate({
        latitude: lat,
        longitude: lng,
        locationName: resolvedName,
        accuracy: loc.coords.accuracy,
        isCustom: false,
        source: 'GPS_DEVICE'
      });
    } catch (err: any) {
      setErrorMessage(`Failed to obtain GPS location: ${err.message || 'Please enable device location'}`);
      setLocationName('Location Detection Failed');
    } finally {
      setIsLocating(false);
    }
  };

  const handleCapturePhoto = async () => {
    setErrorMessage(null);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture hazard observations.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: 'PHOTO',
          mimeType: asset.mimeType || 'image/jpeg',
          filename: asset.fileName || `hazard_photo_${Date.now()}.jpg`,
          fileSize: asset.fileSize
        });
      }
    } catch (err: any) {
      setErrorMessage('Could not open camera: ' + (err.message || err));
    }
  };

  const handleRecordVideo = async () => {
    setErrorMessage(null);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to record hazard observations.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
        quality: 0.85
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: 'VIDEO',
          mimeType: asset.mimeType || 'video/mp4',
          filename: asset.fileName || `hazard_video_${Date.now()}.mp4`,
          fileSize: asset.fileSize
        });
      }
    } catch (err: any) {
      setErrorMessage('Could not open video recorder: ' + (err.message || err));
    }
  };

  const handlePickFromGallery = async () => {
    setErrorMessage(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select photos/videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
        allowsEditing: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || (asset.mimeType && asset.mimeType.startsWith('video/'));

        setSelectedMedia({
          uri: asset.uri,
          type: isVideo ? 'VIDEO' : 'PHOTO',
          mimeType: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
          filename: asset.fileName || `hazard_media_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          fileSize: asset.fileSize
        });
      }
    } catch (err: any) {
      setErrorMessage('Could not select from gallery: ' + (err.message || err));
    }
  };

  const handleSubmit = async () => {
    if (!selectedMedia) {
      Alert.alert('Media Required', 'Please take a photo, record a video, or select one from your gallery.');
      return;
    }

    if (!coords) {
      Alert.alert('GPS Location Required', 'Please wait for your device to obtain GPS coordinates or tap Refresh GPS.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      await submitPublicReport({
        uri: selectedMedia.uri,
        name: selectedMedia.filename,
        type: selectedMedia.mimeType,
        mediaType: selectedMedia.type,
        category: selectedCategory,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationName: locationName,
        description: description.trim()
      });

      setUploadSuccess(true);
      if (onReportSubmitted) {
        onReportSubmitted();
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMessage(err.message || 'Failed to submit report. Please verify connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedMedia(null);
    setDescription('');
    setUploadSuccess(false);
    setErrorMessage(null);
    loadActiveCoordinates();
  };

  if (uploadSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Report Successfully Submitted!</Text>
          <Text style={styles.successMessage}>
            Your geo-tagged hazard report has been securely transmitted to the disaster management backend. It is now visible to officials on the Public Reports dashboard.
          </Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Category: </Text>
              {selectedCategory}
            </Text>
            <Text style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>GPS: </Text>
              {coords ? `${coords.latitude.toFixed(5)}° N, ${coords.longitude.toFixed(5)}° E` : ''}
            </Text>
            <Text style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Location: </Text>
              {locationName}
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
            <Text style={styles.primaryButtonText}>Upload Another Observation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.header}>
        <Text style={styles.headerBadge}>FIELD & CITIZEN REPORTING</Text>
        <Text style={styles.headerTitle}>Upload Hazard Observation</Text>
        <Text style={styles.headerSubtitle}>
          Upload geo-tagged photos/videos of cracks, slope movements, or road obstructions to alert disaster authorities.
        </Text>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Step 1: Category Selection */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>1. Select Observation Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>{cat.label}</Text>
                <Text style={styles.categoryDesc} numberOfLines={2}>
                  {cat.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Step 2: Media Capture & Preview */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>2. Capture or Select Photo / Video</Text>

        {!selectedMedia ? (
          <View style={styles.mediaActionRow}>
            <TouchableOpacity style={styles.mediaActionButton} onPress={handleCapturePhoto} activeOpacity={0.75}>
              <Text style={styles.mediaActionIcon}>📷</Text>
              <Text style={styles.mediaActionLabel}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaActionButton} onPress={handleRecordVideo} activeOpacity={0.75}>
              <Text style={styles.mediaActionIcon}>🎥</Text>
              <Text style={styles.mediaActionLabel}>Record Video</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaActionButton} onPress={handlePickFromGallery} activeOpacity={0.75}>
              <Text style={styles.mediaActionIcon}>🖼️</Text>
              <Text style={styles.mediaActionLabel}>Gallery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mediaPreviewCard}>
            {selectedMedia.type === 'PHOTO' ? (
              <Image source={{ uri: selectedMedia.uri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.videoPreviewPlaceholder}>
                <Text style={styles.videoPreviewIcon}>🎬</Text>
                <Text style={styles.videoPreviewTitle}>Video Captured</Text>
                <Text style={styles.videoPreviewSubtitle}>{selectedMedia.filename}</Text>
              </View>
            )}

            <View style={styles.mediaMetaBar}>
              <View style={styles.mediaTypeBadge}>
                <Text style={styles.mediaTypeBadgeText}>{selectedMedia.type}</Text>
              </View>

              <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setSelectedMedia(null)}>
                <Text style={styles.removeMediaBtnText}>✕ Change Media</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Step 3: Geo-Tag Coordinates from Monitor */}
      <View style={styles.sectionCard}>
        <View style={styles.locationHeaderRow}>
          <View style={{ flex: 1, marginRight: SPACING.sm }}>
            <Text style={styles.sectionTitle}>3. Geo-Tag Coordinates</Text>
            <Text style={styles.coordSourceTag}>
              {isCustomCoord
                ? '📍 Synced with Active Monitor Assessment'
                : '🛰️ Synced with Monitor Location'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshGpsBtn}
            onPress={fetchRealGpsLocation}
            disabled={isLocating}
            activeOpacity={0.7}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#0F2417" />
            ) : (
              <Text style={styles.refreshGpsText}>🔄 Refresh GPS</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.gpsDisplayBox}>
          <View style={styles.gpsCoordRow}>
            <Text style={styles.gpsPinIcon}>📍</Text>
            <View style={styles.gpsCoordTexts}>
              {coords ? (
                <>
                  <Text style={styles.gpsLatLon}>
                    {coords.latitude.toFixed(6)}° N, {coords.longitude.toFixed(6)}° E
                  </Text>
                  <Text style={styles.gpsAccuracy}>
                    Source: {coordSource} • Accuracy: ±{coords.accuracy ? Math.round(coords.accuracy) : 5}m
                  </Text>
                </>
              ) : (
                <Text style={styles.gpsDetecting}>
                  {isLocating ? 'Loading active monitor coordinates...' : 'Coordinates not yet loaded.'}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.locationNameBox}>
            <Text style={styles.locationNameLabel}>RESOLVED SECTOR / LOCATION:</Text>
            <Text style={styles.locationNameText}>{locationName}</Text>
          </View>
        </View>
      </View>

      {/* Step 4: Notes / Details (Optional) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>4. Field Notes / Observations (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="e.g. 5cm crack extending across NH-27 road shoulder near tunnel..."
          placeholderTextColor="#8EA096"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, (!selectedMedia || !coords || isUploading) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!selectedMedia || !coords || isUploading}
        activeOpacity={0.8}
      >
        {isUploading ? (
          <View style={styles.buttonLoadingRow}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.submitButtonText}>Uploading Geo-Tagged Report...</Text>
          </View>
        ) : (
          <Text style={styles.submitButtonText}>📤 Submit Geo-Tagged Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.bgSurface
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 40
  },
  header: {
    marginBottom: SPACING.md
  },
  headerBadge: {
    ...TYPOGRAPHY.label,
    color: '#059669',
    marginBottom: 4
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: APP_COLORS.textPrimary
  },
  headerSubtitle: {
    ...TYPOGRAPHY.subheading,
    marginTop: 4,
    color: APP_COLORS.textSecondary
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm
  },
  errorIcon: {
    fontSize: 16
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: '#991B1B',
    flex: 1
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    ...SHADOWS.card
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: APP_COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm
  },
  categoryCard: {
    width: '48%',
    backgroundColor: APP_COLORS.bgSurface,
    borderWidth: 1.5,
    borderColor: APP_COLORS.borderDefault,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'flex-start'
  },
  categoryCardSelected: {
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    borderColor: '#059669'
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  categoryLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: APP_COLORS.textPrimary,
    fontWeight: '700'
  },
  categoryLabelSelected: {
    color: '#064E3B'
  },
  categoryDesc: {
    ...TYPOGRAPHY.caption,
    color: APP_COLORS.textMuted,
    marginTop: 2,
    fontSize: 10
  },
  mediaActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  mediaActionButton: {
    flex: 1,
    backgroundColor: APP_COLORS.bgSurface,
    borderWidth: 1.5,
    borderColor: APP_COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed'
  },
  mediaActionIcon: {
    fontSize: 26,
    marginBottom: 6
  },
  mediaActionLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: APP_COLORS.textPrimary
  },
  mediaPreviewCard: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    backgroundColor: '#0F172A'
  },
  previewImage: {
    width: '100%',
    height: 200
  },
  videoPreviewPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md
  },
  videoPreviewIcon: {
    fontSize: 36,
    marginBottom: 6
  },
  videoPreviewTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700'
  },
  videoPreviewSubtitle: {
    ...TYPOGRAPHY.caption,
    color: '#94A3B8',
    marginTop: 2
  },
  mediaMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.borderDefault
  },
  mediaTypeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  mediaTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1'
  },
  removeMediaBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  removeMediaBtnText: {
    ...TYPOGRAPHY.bodySmall,
    color: '#DC2626',
    fontWeight: '700'
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm
  },
  coordSourceTag: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    fontWeight: '700',
    marginTop: 2
  },
  refreshGpsBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: APP_COLORS.bgAccentMintSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  refreshGpsText: {
    ...TYPOGRAPHY.caption,
    color: '#064E3B',
    fontWeight: '700'
  },
  gpsDisplayBox: {
    backgroundColor: APP_COLORS.bgSurface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault
  },
  gpsCoordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  gpsPinIcon: {
    fontSize: 20
  },
  gpsCoordTexts: {
    flex: 1
  },
  gpsLatLon: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '800',
    color: APP_COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  gpsAccuracy: {
    ...TYPOGRAPHY.caption,
    color: APP_COLORS.textMuted,
    fontSize: 11
  },
  gpsDetecting: {
    ...TYPOGRAPHY.bodySmall,
    color: APP_COLORS.textMuted,
    fontStyle: 'italic'
  },
  locationNameBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.borderDefault
  },
  locationNameLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 9,
    color: APP_COLORS.textMuted
  },
  locationNameText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
    marginTop: 2
  },
  notesInput: {
    backgroundColor: APP_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    color: APP_COLORS.textPrimary,
    textAlignVertical: 'top',
    minHeight: 75
  },
  submitButton: {
    backgroundColor: '#0F2417',
    borderRadius: RADIUS.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.elevated
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7
  },
  submitButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontSize: 15
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    margin: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
    ...SHADOWS.elevated
  },
  successIcon: {
    fontSize: 50,
    marginBottom: SPACING.md
  },
  successTitle: {
    ...TYPOGRAPHY.h2,
    color: '#166534',
    textAlign: 'center'
  },
  successMessage: {
    ...TYPOGRAPHY.body,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20
  },
  summaryBox: {
    width: '100%',
    backgroundColor: APP_COLORS.bgSurface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.borderDefault,
    gap: 6
  },
  summaryItem: {
    ...TYPOGRAPHY.bodySmall,
    color: APP_COLORS.textPrimary
  },
  summaryLabel: {
    fontWeight: '700',
    color: APP_COLORS.textSecondary
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#0F2417',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF'
  }
});
