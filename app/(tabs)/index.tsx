import { StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

const LOCATION_TRACKING = "location-tracking";

// Definir el tipo para los datos de ubicación
type LocationTaskData = {
	locations: Location.LocationObject[];
};

// Definir la tarea en segundo plano con el tipo correcto
TaskManager.defineTask(
	LOCATION_TRACKING,
	async ({
		data,
		error,
	}: TaskManager.TaskManagerTaskBody<LocationTaskData>) => {
		if (error) {
			console.error(error);
			return;
		}
		if (data) {
			const { locations } = data as LocationTaskData;
			console.log("Location in background", locations);
			// Aquí puedes implementar la lógica para enviar la ubicación a tu servidor
		}
	}
);

// El resto del código permanece igual
export default function HomeScreen() {
	const [location, setLocation] = useState<Location.LocationObject | null>(
		null
	);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [isTracking, setIsTracking] = useState(false);

	useEffect(() => {
		(async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				setErrorMsg("Permission to access location was denied");
				return;
			}

			let location = await Location.getCurrentPositionAsync({});
			setLocation(location);
		})();
	}, []);

	const startTracking = async () => {
		try {
			const { status } = await Location.requestBackgroundPermissionsAsync();
			if (status !== "granted") {
				setErrorMsg("Permission to access location in background was denied");
				return;
			}

			await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
				accuracy: Location.Accuracy.Balanced,
				timeInterval: 5000,
				distanceInterval: 0,
				foregroundService: {
					notificationTitle: "Location Tracking",
					notificationBody: "Tracking your location",
				},
			});

			setIsTracking(true);
		} catch (err: any) {
			setErrorMsg(err.message);
		}
	};

	const stopTracking = async () => {
		try {
			await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
			setIsTracking(false);
		} catch (err: any) {
			setErrorMsg(err.message);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="title">Location Tracking Test</ThemedText>

			<ThemedView style={styles.locationContainer}>
				<ThemedText>
					{errorMsg
						? errorMsg
						: location
						? `Lat: ${location.coords.latitude}\nLon: ${location.coords.longitude}`
						: "Waiting for location..."}
				</ThemedText>
			</ThemedView>

			<ThemedView style={styles.buttonContainer}>
				<ThemedText
					type="defaultSemiBold"
					onPress={isTracking ? stopTracking : startTracking}
					style={styles.button}
				>
					{isTracking ? "Stop Tracking" : "Start Tracking"}
				</ThemedText>
			</ThemedView>

			{isTracking && (
				<ThemedText style={styles.trackingText}>
					Tracking is active! Check console for updates.
				</ThemedText>
			)}
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	locationContainer: {
		marginTop: 20,
		marginBottom: 20,
		alignItems: "center",
	},
	buttonContainer: {
		marginTop: 20,
	},
	button: {
		padding: 10,
		backgroundColor: "#A1CEDC",
		borderRadius: 5,
		overflow: "hidden",
	},
	trackingText: {
		marginTop: 20,
		color: "green",
	},
});
