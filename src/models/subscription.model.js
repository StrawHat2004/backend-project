import mongoose, {Schema} from "mongoose";
const subscriptionSchema = new Schema(
    {
        subscriber : {
            type: Schema.type.ObjectId,
            ref: 'User',
            required: true,
        },
        channel: {
            type: Schema.type.ObjectId,
            ref: 'User',
            required: true,
        },
    }, 
    {
        timestamps: true
    }
)

export const Subscription = mongoose.model('Subscription',subscriptionSchema);