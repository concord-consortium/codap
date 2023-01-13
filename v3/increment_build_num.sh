CURRENT_BUILD_NUM=$(grep -Eo '[0-9]+' ~/v3/build_number.json)
echo current build num $CURRENT_BUILD_NUM
NEW_BUILD_NUM=$(( $CURRENT_BUILD_NUM + 1))
echo new build num $NEW_BUILD_NUM
sed -i '' -e "s/$CURRENT_BUILD_NUM/$NEW_BUILD_NUM/" ~/v3/build_number.json
echo $(cat ~/v3/build_number.json)
exit 0
