export type ResponseType<T> = Promise<{
  data: T;
  message: string;
}>;