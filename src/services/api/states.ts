import { apiClient } from './client'
import type { StateResponse } from '@/types/state'

export const statesApi = {
  async getStates(countryCode: string = 'US'): Promise<StateResponse> {
    try {
      const response = await apiClient.get(`/v1/states/${countryCode}`)
      return response.data
    } catch (error) {
      throw error
    }
  }
}
