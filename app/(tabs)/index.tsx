import { StyleSheet } from "react-native";
import { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import io from "socket.io-client";

const LOCATION_TRACKING = "location-tracking";
const SOCKET_URL = "https://test-maps-imvz.onrender.com";

// Definir el tipo para los datos de ubicación
type LocationTaskData = {
	locations: Location.LocationObject[];
};

// Referencia global para el socket
let socketRef: any = null;

// Función para emitir la ubicación al socket
const emitLocation = (location: Location.LocationObject) => {
	if (socketRef) {
		const locationData = {
			latitud: location.coords.latitude,
			longitud: location.coords.longitude,
			hora: new Date().toISOString(),
		};
		socketRef.emit("location", locationData);
		console.log("Ubicación emitida:", locationData);
	}
};

// Definir la tarea en segundo plano
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
			// Emitir la ubicación más reciente
			if (locations && locations.length > 0) {
				emitLocation(locations[0]);
			}
		}
	}
);

export default function HomeScreen() {
	const [location, setLocation] = useState<Location.LocationObject | null>(
		null
	);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [isTracking, setIsTracking] = useState(false);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		// Inicializar el socket
		socketRef = io(SOCKET_URL);

		socketRef.on("connect", () => {
			console.log("Conectado al servidor");
			setIsConnected(true);
		});

		socketRef.on("disconnect", () => {
			console.log("Desconectado del servidor");
			setIsConnected(false);
		});

		// Obtener ubicación inicial
		(async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== "granted") {
				setErrorMsg("Permission to access location was denied");
				return;
			}
			let location = await Location.getCurrentPositionAsync({});
			setLocation(location);
			// Emitir ubicación inicial
			emitLocation(location);
		})();

		// Cleanup
		return () => {
			if (socketRef) {
				socketRef.disconnect();
			}
		};
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
				<ThemedText style={styles.connectionStatus}>
					{isConnected ? "Connected to server" : "Disconnected from server"}
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
					Tracking is active! Location updates are being sent to the server.
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
	connectionStatus: {
		marginTop: 10,
		color: "#666",
	},
});
