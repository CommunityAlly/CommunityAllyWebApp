echo on
call grunt make-dist
echo Syncing S3 files...
REM 31104000 seconds is 360 days
aws s3 sync --profile allywebapp --acl public-read --delete --cache-control 'max-age=31104000' dist/ s3://ally-web-app
aws s3 cp --profile allywebapp --acl public-read --cache-control 'max-age=0' dist/index.html s3://ally-web-app/index.html
ECHO Updating CloudFront...
aws cloudfront --profile allywebapp create-invalidation --distribution-id E315000CU58RHO --paths '/*'
ECHO All done!
PAUSE


# Creating a profile
# 1. aws configure --profile healthbridge
# 2. Access key from Bill
# 3. Secret access key from Bill
# 4. Default region: us-east-1
# 5. Default output: json
