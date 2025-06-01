import { SpecificState } from "tesm"
import { AppLoading } from "../state"
import { useGlobalState } from "./context"

type LoadedModel = SpecificState<AppLoading.Model, "loaded">

const App = (props: LoadedModel) => {
	return (
		<div>
			<h1>Welcome {props.initialize_data.username}</h1>
		</div>
	)
}

const LoadingScreen = (props: { stage: AppLoading.Model["state"] }) => {
	return <div>loading stage: {props.stage}</div>
}

export const AppLoader = () => {
	const { model } = useGlobalState()

	switch (model.state) {
		case "initial":
		case "waiting_initialize":
		case "waiting_config":
			return <LoadingScreen stage={model.state} />
		case "loaded":
			return <App {...model} />
	}
}
