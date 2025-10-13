#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FaceBlurModule, NSObject)

RCT_EXTERN_METHOD(blurFacesInVideo:(NSString *)inputPath
                  blurIntensity:(NSInteger)blurIntensity
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end

