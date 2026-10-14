import createFetchClient from 'openapi-fetch'
import createClient from 'openapi-react-query'
import type { paths } from '@/schemas/openapi/schema'

const fetchClient = createFetchClient<paths>({
    baseUrl: "http://localhost:5173/"
})
export const $api = createClient(fetchClient)

