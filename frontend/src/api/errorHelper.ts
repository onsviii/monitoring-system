export interface ErrorResponse {
  status: number;
  message: string;
}

export async function handleBackendResponse(response: Response, defaultErrorMessage: string) {
  if (!response.ok) {
    try {
      const errorData = await response.json() as ErrorResponse;
      if (errorData && errorData.message) {
        throw new Error(errorData.message);
      }
    } catch (e: any) {
      if (e.message && e.message !== 'Unexpected end of JSON input') {
        throw e; // It was our explicitly thrown error from the try block
      }
    }
    throw new Error(`${defaultErrorMessage}: ${response.statusText}`);
  }
}
