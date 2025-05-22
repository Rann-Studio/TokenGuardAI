import { z } from 'zod';

export const TeleMessageSchema = z.object({
    text: z.string({
        required_error: 'Text is required',
        invalid_type_error: 'Text must be a string',
    }),
});

// type TeleMessageValue = z.infer<typeof TeleMessageSchema>;