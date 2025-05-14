// #region example
import { SpecificState } from "tesm"
import { AuthFlowSimple } from "../state"
import { useAuthContext } from "./context"

type AuthedModel = SpecificState<AuthFlowSimple.Model, "authed">

const App = (props: AuthedModel) => {
	const userData = { username: "Username" } /** extracted from props.jwt */
	return (
		<div>
			<h1>Welcome {userData.username}</h1>
		</div>
	)
}
export const Screen = () => {
	const { model } = useAuthContext()

	switch (model.state) {
		case "waiting_for_jwt":
		case "auth_expired_no_network":
		case "jwt_request_failed":
		case "not_authed":
			return <LoginForm />
		case "authed":
			return <App {...model} />
	}
}
// #endregion example

const LoginForm = () => {
	return <></>
}
