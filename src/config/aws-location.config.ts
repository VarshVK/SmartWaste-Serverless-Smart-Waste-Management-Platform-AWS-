import { LocationClient } from "@aws-sdk/client-location";

export const locationClient = new LocationClient({
    region: '',
    credentials:{
      accessKeyId: '',
      secretAccessKey: '',
    }
});

  