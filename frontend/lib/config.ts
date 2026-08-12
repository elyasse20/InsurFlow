/** Points to the Spring Boot backend API. Defaults to relative /api path for Next.js proxying. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export default API_BASE_URL;
