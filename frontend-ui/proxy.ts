export { auth as proxy } from "./auth";

// Tell the bouncer to lock the coach dashboard
export const config = { 
    matcher: ["/coach"] 
};